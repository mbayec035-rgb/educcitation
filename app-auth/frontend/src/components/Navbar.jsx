// Barre de navigation : elle change selon que l'utilisateur
// est connecté ou non (lien Connexion / Inscription OU Profil / Déconnexion)

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Navbar() {
  const { utilisateur, logout } = useAuth();
  const navigate = useNavigate();

  function gererDeconnexion() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        🎓 App Auth
      </Link>

      <div className="navbar-liens">
        <NavLink to="/" end>
          Accueil
        </NavLink>

        {utilisateur ? (
          // ------- Utilisateur connecté -------
          <>
            <NavLink to="/profil">Profil</NavLink>
            <span className="navbar-pseudo">{utilisateur.nom || utilisateur.email}</span>
            <button type="button" className="btn btn-petit" onClick={gererDeconnexion}>
              Déconnexion
            </button>
          </>
        ) : (
          // ------- Visiteur non connecté -------
          <>
            <NavLink to="/login">Connexion</NavLink>
            <NavLink to="/register" className="btn btn-petit">
              Inscription
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
