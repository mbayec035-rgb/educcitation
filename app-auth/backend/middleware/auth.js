// ============================================================
// Middleware d'authentification
// Il vérifie l'en-tête HTTP :  Authorization: Bearer <token>
// Si le token est absent ou invalide -> 401
// Sinon on continue vers la route protégée (next()).
// ============================================================

const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  try {
    // 1. On lit l'en-tête Authorization envoyé par le frontend
    const enTete = req.headers.authorization;

    if (!enTete || !enTete.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès refusé : token manquant.' });
    }

    // 2. On enlève le mot "Bearer " pour ne garder que le token
    const token = enTete.slice(7);

    // 3. On vérifie que le token est bien signé avec JWT_SECRET
    //    et qu'il n'est pas expiré. jwt.verify lève une erreur sinon.
    const chargeUtile = jwt.verify(token, process.env.JWT_SECRET);

    // 4. On attache les informations de l'utilisateur à la requête
    //    pour que la route puisse les utiliser (req.utilisateur.id)
    req.utilisateur = chargeUtile;

    return next();
  } catch (erreur) {
    // Token falsifié, modifié ou expiré
    return res.status(401).json({ message: 'Accès refusé : token invalide ou expiré.' });
  }
}

module.exports = auth;
