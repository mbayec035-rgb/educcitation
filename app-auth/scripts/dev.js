/* ============================================================
   Lance le backend ET le frontend EN MÊME TEMPS avec une seule
   commande, lancée depuis la racine du projet (app-auth/) :
        npm run dev

   Aucune dépendance externe : on utilise le module intégré
   "child_process" de Node.js.

   Résultat attendu :
     - API        : http://localhost:4000
     - Frontend   : http://localhost:5173  <- ouvrir ça dans le navigateur

   Pour arrêter : Ctrl + C dans le terminal.
   ============================================================ */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Dossier "app-auth" : le parent du dossier qui contient ce fichier
const racine = path.join(__dirname, '..');

// Les processus lancés, gardés en mémoire pour pouvoir les arrêter
const enfants = {};

// Arrête proprement tout ce qui tourne, puis quitte
function arreterTout(code) {
  for (const nom of Object.keys(enfants)) {
    const enfant = enfants[nom];
    // exitCode === null signifie "le processus tourne encore"
    if (enfant.exitCode === null) {
      enfant.kill();
    }
  }
  process.exit(code);
}

// Démarre un des deux projets
function lancer(nom, dossier, args) {
  const dossierComplet = path.join(racine, dossier);

  // Vérification : les dépendances sont-elles installées ?
  if (!fs.existsSync(path.join(dossierComplet, 'node_modules'))) {
    console.error(`❌ Le dossier ${dossier}/node_modules est introuvable.`);
    console.error(`   Installez d'abord les dépendances :`);
    console.error(`\n   cd ${dossier}   puis   npm install\n`);
    arreterTout(1);
  }

  // process.execPath = chemin de l'exécutable Node en cours.
  // Cela fonctionne sur Windows, macOS et Linux sans aucune configuration.
  const enfant = spawn(process.execPath, args, {
    cwd: dossierComplet, // INDISPENSABLE : backend/.env est lu depuis ce dossier
    stdio: 'inherit', // les logs s'affichent directement dans ce terminal
  });

  enfant.on('error', (erreur) => {
    console.error(`❌ Impossible de démarrer ${nom} : ${erreur.message}`);
    arreterTout(1);
  });

  // Si l'un des deux s'arrête (erreur ou Ctrl+C), on ferme l'autre
  enfant.on('exit', (code) => {
    console.log(`\n⏹  Le processus "${nom}" s'est arrêté.`);
    arreterTout(code || 0);
  });

  enfants[nom] = enfant;
  return enfant;
}

console.log('⏳ Démarrage en cours...');
console.log('   - API      : http://localhost:4000');
console.log('   - Frontend : http://localhost:5173  <- ouvrir dans le navigateur');
console.log('   (Ctrl + C pour tout arrêter)\n');

// 1. Le backend : on lance directement node avec le watch intégré
lancer('backend', 'backend', ['--watch', 'index.js']);

// 2. Le frontend : on lance le petit programme de Vite
lancer('frontend', 'frontend', ['node_modules/vite/bin/vite.js']);
