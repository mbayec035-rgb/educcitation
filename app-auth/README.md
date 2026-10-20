# App Auth — Authentification complète (Express + PostgreSQL + React)

Projet d'authentification prêt à déployer :

| Dossier | Rôle | Technologie |
|---|---|---|
| `backend/` | API REST (inscription, connexion, profil) | Node.js, Express, PostgreSQL |
| `frontend/` | Interface web | React, Vite, React Router |

**Fonctionnalités**

- Inscription avec validation (email + mot de passe 6 caractères minimum)
- Mot de passe **haché** avec bcrypt (jamais stocké en clair)
- Connexion renvoyant un **token JWT valable 7 jours**
- Route `/profil` **protégée** par middleware
- Frontend avec `AuthContext`, `ProtectedRoute`, barre de navigation dynamique
- 100 % requêtes SQL **paramétrées** (`$1`, `$2`...) → pas d'injection SQL
- Aucun secret dans le code : tout passe par les variables d'environnement

---

## Structure du projet

```
app-auth/
├── package.json               # Scripts à la racine : npm run dev lance tout
├── scripts/
│   └── dev.js                 # Démarre backend + frontend ensemble
├── backend/
│   ├── index.js               # Le serveur Express et toutes les routes
│   ├── middleware/auth.js     # Middleware qui vérifie le token JWT
│   ├── .env.example           # Modèle de configuration (à copier en .env)
│   ├── .gitignore
│   └── scripts/
│       └── backup.md          # Comment sauvegarder/restaurer la base
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example           # Modèle : VITE_API_URL
│   └── src/
│       ├── main.jsx           # Point d'entrée React
│       ├── App.jsx            # Les routes (/login, /profil...)
│       ├── AuthContext.jsx    # Gestion du token et de l'utilisateur
│       ├── ProtectedRoute.jsx # Redirige vers /login si non connecté
│       ├── components/Navbar.jsx
│       └── pages/             # Accueil, Register, Login, Profil
└── README.md
```

---

# 1. Installation locale

## Prérequis

- **Node.js 18 ou +** : <https://nodejs.org>
- **PostgreSQL** : <https://www.postgresql.org/download/windows/>
  (ou une base existante, voir l'option B plus bas)
- Vérifier l'installation :

```bash
node --version
psql --version
```

## Option A : PostgreSQL installé sur votre machine

Créez une base vide — la table `users` sera créée toute seule au premier
démarrage du serveur :

```bash
psql -U postgres -c "CREATE DATABASE app_auth;"
```

## Option B : utiliser la base Render depuis votre machine

Vous pouvez tester avec la **base de test** de Render (voir §2) en utilisant
l'**External Database URL** et en mettant `DB_SSL=true`.

## ⚡ Démarrage rapide (depuis la racine du projet)

Depuis le dossier `app-auth/` lui-même, **une seule commande** lance le
backend **et** le frontend en même temps :

```bash
# 1. Installer les dépendances des deux projets (une seule fois)
npm run setup

# 2. Créer puis remplir les deux fichiers de configuration (une seule fois)
copy backend\.env.example  backend\.env      # puis le modifier
copy frontend\.env.example frontend\.env     # puis le modifier

# 3. Tout démarrer d'un coup
npm run dev
```

Puis ouvrez **<http://localhost:5173>** dans le navigateur.
`Ctrl + C` arrête les deux processus.

> Les scripts disponibles à la racine :
>
> | Commande | Rôle |
> |---|---|
> | `npm run setup` | installe les dépendances de `backend/` et `frontend/` |
> | `npm run dev` | démarre l'API **et** le frontend (recommandé) |
> | `npm run dev:backend` | ne démarre que l'API (port 4000) |
> | `npm run dev:frontend` | ne démarre que le frontend (port 5173) |
> | `npm run build` | build de production du frontend dans `frontend/dist/` |
>
> ⚠️ `npm run dev` ne fonctionne **que depuis la racine** `app-auth/`.
> Si vous êtes dans `backend/` ou `frontend/`, `npm run dev` ne démarre
> que ce sous-projet (voir ci-dessous).

## Étape 1 — le backend

Vous pouvez aussi lancer chaque partie **dans son propre terminal** :

```bash
cd backend

# 1. Copier le fichier de configuration
cp .env.example .env        # Windows : copy .env.example .env

# 2. Ouvrir .env et remplir DATABASE_URL, JWT_SECRET, etc.
# 3. Installer les dépendances
npm install

# 4. Démarrer
npm start
```

Résultat attendu :

```
✅ Table "users" prête.
🚀 Serveur démarré sur http://localhost:4000
```

Pendant le développement, `npm run dev` redémarre le serveur automatiquement à
chaque modification :

```bash
npm run dev
```

### Votre fichier `.env` (exemple)

```env
DATABASE_URL=postgres://postgres@localhost:5432/app_auth
DB_SSL=false
JWT_SECRET=une_longue_phrase_secrete_aleatoire
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

> ⚠️ `JWT_SECRET` doit être **long et imprévisible** en production.
> Générez-en un avec : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Étape 2 — le frontend

Ouvrez un **nouveau** terminal (gardez le premier ouvert, le backend tourne) :

```bash
cd frontend
cp .env.example .env         # Windows : copy .env.example .env
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:5173> dans le navigateur.

## Tester avec curl

```bash
# 1. Message de test
curl http://localhost:4000/

# 2. Inscription
curl -X POST http://localhost:4000/register \
  -H "Content-Type: application/json" \
  -d '{"nom":"Amina","email":"amina@test.com","password":"secret123"}'

# 3. Connexion (on récupère le token)
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amina@test.com","password":"secret123"}'

# 4. Profil (remplacer TOKEN par le vrai token renvoyé à l'étape 3)
curl http://localhost:4000/profil -H "Authorization: Bearer TOKEN"
```

Codes de réponse à connaître :

| Code | Signification |
|---|---|
| 200 / 201 | Succès |
| 400 | Données invalides (email faux, mot de passe < 6 caractères) |
| 401 | Non connecté, ou identifiants incorrects |
| 404 | Route inconnue / utilisateur introuvable |
| 409 | Email déjà utilisé |
| 500 | Erreur serveur |

---

# 2. Déploiement sur Render

> Render propose 3 services gratuits : une **base PostgreSQL**, un
> **web service** (le backend) et un **static site** (le frontend).

## 2.1 Créer la base PostgreSQL

1. Se connecter à <https://dashboard.render.com>
2. **New** → **PostgreSQL**
3. Plan **Free**, nommer la base `app-auth-db`, région la plus proche
4. Cliquer **Create Database**
5. Dans l'onglet **Connections**, copier :
   - **Internal Database URL** → pour le backend déployé sur Render
   - **External Database URL** → pour se connecter depuis votre PC

> ⚠️ Notez la **date d'expiration** affichée sur la carte de la base :
> sur le plan gratuit, la base est **supprimée au bout de 30 jours** (§3).

## 2.2 Créer le backend (Web Service)

1. **New** → **Web Service**
2. Connecter le dépôt Git (ou utiliser "Deploy from Git repo")
3. Régler :

| Réglage | Valeur |
|---|---|
| Name | `app-auth-api` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. Ajouter les **Environment Variables** :

| Clé | Valeur |
|---|---|
| `DATABASE_URL` | l'**Internal Database URL** copiée à l'étape 2.1 |
| `JWT_SECRET` | une longue phrase secrète (à générer, ne jamais commiter) |
| `CORS_ORIGIN` | l'URL du frontend, ex : `https://app-auth-frontend.onrender.com` |
| `DB_SSL` | `false` (l'URL **interne** n'a pas besoin de SSL) |

> ℹ️ Si vous utilisez plutôt l'**External Database URL**, mettez `DB_SSL=true`.
> Le code n'active le SSL que si `DB_SSL` vaut `true`.

5. **Create Web Service**

Au démarrage, les logs doivent afficher :

```
✅ Table "users" prête.
🚀 Serveur démarré sur http://<port>
```

Tester : ouvrir `https://votre-backend.onrender.com/` → le message de test.

## 2.3 Créer le frontend (Static Site)

1. **New** → **Static Site**
2. Régler :

| Réglage | Valeur |
|---|---|
| Name | `app-auth-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

3. Ajouter la variable d'environnement :

| Clé | Valeur |
|---|---|
| `VITE_API_URL` | l'URL du backend, ex : `https://app-auth-api.onrender.com` |

4. **Create Static Site**

> ℹ️ Les variables `VITE_*` sont **écrites dans le fichier JS au moment du
> build**. Si vous les changez, il faut **relancer un déploiement**
> (onglet *Manual Deploy* → *Clear build cache & deploy*).

## 2.4 Ajouter la règle de réécriture (React Router)

Sans cette règle, recharger la page sur `/login` ou `/profil` affiche une
erreur 404, car Render cherche un fichier qui n'existe pas.

1. Ouvrir le site frontend sur Render
2. Onglet **Redirects/Rewrites**
3. Ajouter :

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | **Rewrite** |

4. **Save**

React Router prend ensuite le relais côté navigateur.

## 2.5 Vérification finale

1. Ouvrir l'URL du frontend
2. S'inscrire avec un email et un mot de passe
3. Se déconnecter, puis se reconnecter
4. Ouvrir le profil : les informations s'affichent

---

# 3. ⚠️ La base gratuite expire après 30 jours

Sur le plan **Free**, Render **supprime la base PostgreSQL 30 jours après sa
création**, avec toutes les données. C'est la première chose à prévoir après
le déploiement.

## Sauvegarder la base

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges > sauvegarde.sql

# Version compacte (binaire) recommandée :
pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc -f sauvegarde.dump
```

## Migrer vers une nouvelle base

1. **New** → **PostgreSQL** → plan **Free** (la nouvelle base est vide)
2. Restaurer la sauvegarde :

```bash
pg_restore --no-owner --no-privileges -d "$NOUVELLE_DATABASE_URL" sauvegarde.dump
# ou, pour un fichier .sql :
psql "$NOUVELLE_DATABASE_URL" < sauvegarde.sql
```

3. Mettre à jour `DATABASE_URL` dans le web service backend
   (onglet **Environment** → **Save**, Render redémarre tout seul)
4. Vérifier que les utilisateurs peuvent toujours se connecter

> Le backend recrée la table `users` automatiquement au démarrage
> (`CREATE TABLE IF NOT EXISTS`), donc une base vide fonctionne : seule la
> table est recréée, pas les données. D'où l'importance du `pg_dump`.

Toutes les commandes détaillées, les erreurs fréquentes et l'automatisation
sont dans **[backend/scripts/backup.md](backend/scripts/backup.md)**.

**Astuce** : préférez l'**Internal Database URL** (gratuite et chiffrée) entre
deux services Render, et gardez l'**External URL** pour vos tests en local.

---

# 4. Sécurité — les règles appliquées

- **bcrypt** : les mots de passe sont hachés (10 rounds), jamais stockés en clair.
- **Messages d'erreur identiques** pour "email inconnu" et "mot de passe faux" :
  on n'apprend pas à un visiteur quels emails sont inscrits.
- **Requêtes paramétrées** uniquement : `WHERE email = $1` et jamais
  `` `WHERE email = '${email}'` `` (injection SQL).
- **JWT signé** avec `JWT_SECRET` et limité à 7 jours.
- **Le mot de passe ne quitte jamais la base** : `/profil` ne sélectionne que
  `id, nom, email, created_at`.
- **Les secrets vivent dans `.env`**, fichier ignoré par Git (`.gitignore`).

---

# 5. Commandes utiles

```bash
# --- À la racine (dossier app-auth/) ---
npm run setup                 # installe backend/ + frontend/ (une seule fois)
npm run dev                   # démarre l'API ET le frontend ⭐
npm run build                 # build de production du frontend

# --- Dans backend/ ---
npm start                     # démarrer le serveur
npm run dev                   # démarrer avec redémarrage automatique

# --- Dans frontend/ ---
npm run dev                   # serveur de développement (port 5173)
npm run build                 # build de production dans dist/
npm run preview               # prévisualiser le build
```

## Problèmes fréquents

| Problème | Cause | Solution |
|---|---|---|
| `Missing script: "dev"` | `npm run dev` lancé dans le mauvais dossier | Se placer à la racine `app-auth/` (voir ⚡ Démarrage rapide) |
| `node_modules est introuvable` | Dépendances non installées | `npm run setup` (ou `npm install` dans chaque sous-dossier) |
| `DATABASE_URL manquante` | `.env` absent ou vide | `cp backend/.env.example backend/.env` puis remplir |
| `password authentication failed` | Mot de passe PostgreSQL incorrect | Vérifier `DATABASE_URL` |
| `CORS blocked` par le navigateur | `CORS_ORIGIN` ne correspond pas à l'URL du frontend | Mettre l'URL exacte (avec `https://`) |
| `Failed to fetch` dans le frontend | `VITE_API_URL` incorrect | Vérifier la variable puis **rebuild** le site |
| Page blanche sur `/profil` après rechargement | Règle de réécriture absente | Ajouter `/*` → `/index.html` (§2.4) |
| `401` alors que le token semble bon | Token expiré (7 jours) | Se reconnecter |
