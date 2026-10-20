/* ============================================================
   API d'authentification — Express + PostgreSQL

   Routes :
     GET  /         -> message de test
     POST /register -> créer un compte
     POST /login    -> se connecter et recevoir un token JWT
     GET  /profil   -> route protégée, infos de l'utilisateur

   RÈGLE D'OR : toutes les requêtes SQL sont PARAMÉTRÉES ($1, $2...).
   On ne concatène JAMAIS une valeur dans la chaîne SQL
   (c'est la porte d'entrée des injections SQL).
   ============================================================ */

// dotenv lit le fichier .env et met ses variables dans process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const auth = require('./middleware/auth');

const app = express();

// ---------- 1. Vérification des variables d'environnement ----------
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquante. Copiez .env.example en .env et remplissez-le.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant. Copiez .env.example en .env et remplissez-le.');
  process.exit(1);
}

// ---------- 2. Connexion à PostgreSQL ----------
// Un "Pool" garde plusieurs connexions ouvertes en même temps :
// c'est plus efficace que d'ouvrir/fermer une connexion à chaque requête.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Le SSL n'est activé QUE si DB_SSL=true
  // (rejectUnauthorized: false = on fait confiance au certificat de Render)
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ---------- 3. Middlewares globaux ----------
app.use(express.json()); // Lit le JSON envoyé dans le corps des requêtes

// CORS : autorise le frontend à appeler l'API.
// L'URL du frontend est définie dans CORS_ORIGIN (fichier .env)
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// ---------- 4. Création de la table au démarrage ----------
// "IF NOT EXISTS" = si la table existe déjà, rien ne se passe.
// Comme ça le serveur fonctionne même avec une base complètement neuve.
const SQL_CREATION_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`;

// Expression régulière simple pour vérifier la forme d'un email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- 5. Les routes ----------

// GET / -> petit message pour vérifier que l'API répond
app.get('/', (req, res) => {
  res.json({ message: '✅ API d\'authentification en ligne. Utilisez /register, /login ou /profil.' });
});

// POST /register -> créer un nouveau compte
app.post('/register', async (req, res) => {
  try {
    const { nom, email, password } = req.body;

    // --- Validation des données reçues ---
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe obligatoires.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Email invalide (ex : pierre@email.com).' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum.' });
    }

    // On enregistre l'email en minuscules pour éviter les doublons
    // ("Pierre@Gmail.com" et "pierre@gmail.com" deviennent identiques)
    const emailNormalise = email.trim().toLowerCase();

    // --- Est-ce que l'email est déjà utilisé ? ---
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [emailNormalise]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    // --- Hachage du mot de passe (10 rounds) ---
    // bcrypt transforme le mot de passe : la base ne stocke que le hash.
    const hash = await bcrypt.hash(password, 10);

    // --- Enregistrement en base ---
    const resultat = await pool.query(
      `INSERT INTO users (nom, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, nom, email, created_at`,
      [nom || null, emailNormalise, hash]
    );

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      utilisateur: resultat.rows[0], // ne contient jamais le mot de passe
    });
  } catch (erreur) {
    // Code Postgres 23505 = violation de contrainte UNIQUE
    // (cas où deux personnes s'inscrivent avec le même email en même temps)
    if (erreur.code === '23505') {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    console.error('Erreur /register :', erreur);
    return res.status(500).json({ message: 'Erreur serveur, réessayez plus tard.' });
  }
});

// POST /login -> vérifie les identifiants et renvoie un token JWT
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const emailNormalise = email.trim().toLowerCase();

    // --- Recherche de l'utilisateur ---
    const resultat = await pool.query(
      'SELECT id, nom, email, password, created_at FROM users WHERE email = $1',
      [emailNormalise]
    );
    const utilisateur = resultat.rows[0];

    // ATTENTION : le message est IDENTIQUE que l'email n'existe pas
    // ou que le mot de passe soit faux. On ne doit pas permettre
    // à un visiteur de deviner quels emails sont inscrits.
    if (!utilisateur) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // --- Comparaison du mot de passe avec le hash stocké ---
    const motDePasseValide = await bcrypt.compare(password, utilisateur.password);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // --- Création du token JWT (valable 7 jours) ---
    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email }, // les données stockées dans le token
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // On renvoie le token + les infos sans le champ password
    delete utilisateur.password;
    return res.json({ message: 'Connexion réussie.', token, utilisateur });
  } catch (erreur) {
    console.error('Erreur /login :', erreur);
    return res.status(500).json({ message: 'Erreur serveur, réessayez plus tard.' });
  }
});

// GET /profil -> route PROTÉGÉE : il faut un token valide
app.get('/profil', auth, async (req, res) => {
  try {
    // Le middleware "auth" a vérifié le token et ajouté req.utilisateur
    const resultat = await pool.query(
      'SELECT id, nom, email, created_at FROM users WHERE id = $1',
      [req.utilisateur.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    // Le SELECT ne demande pas la colonne "password" :
    // le mot de passe ne quitte jamais la base.
    return res.json(resultat.rows[0]);
  } catch (erreur) {
    console.error('Erreur /profil :', erreur);
    return res.status(500).json({ message: 'Erreur serveur, réessayez plus tard.' });
  }
});

// ---------- 6. Démarrage du serveur ----------
async function demarrer() {
  try {
    // On crée la table AVANT d'écouter : le serveur est prêt dès le 1er appel.
    await pool.query(SQL_CREATION_TABLE);
    console.log('✅ Table "users" prête.');

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
    });
  } catch (erreur) {
    console.error('❌ Impossible de démarrer (connexion PostgreSQL échouée) :', erreur.message);
    process.exit(1);
  }
}

demarrer();
