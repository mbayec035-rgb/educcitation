// Page d'accueil : présente le projet et adapte le message
// selon que l'utilisateur est connecté ou non.

import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Accueil() {
  const { utilisateur } = useAuth();

  return (
    <section className="carte">
      <h1>Bienvenue 👋</h1>

      {utilisateur ? (
        <>
          <p>
            Bonjour <strong>{utilisateur.nom || utilisateur.email}</strong>, vous êtes connecté(e).
          </p>
          <p>
            Rendez-vous sur votre <Link to="/profil">profil</Link> pour voir vos informations.
          </p>
        </>
      ) : (
        <>
          <p>Cette application montre une authentification complète :</p>
          <ul className="liste">
            <li>Inscription avec mot de passe haché (bcrypt)</li>
            <li>Connexion et token JWT valable 7 jours</li>
            <li>Page de profil protégée côté API et côté React</li>
          </ul>
          <div className="actions">
            <Link to="/register" className="btn">
              Créer un compte
            </Link>
            <Link to="/login" className="btn btn-secondaire">
              Se connecter
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
