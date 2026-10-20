// Protection des routes : si l'utilisateur n'est pas connecté,
// on le renvoie vers /login au lieu d'afficher la page demandée.

import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { utilisateur, chargement } = useAuth();

  // On attend la fin de la vérification du token avant de décider
  if (chargement) {
    return <p className="chargement">Chargement...</p>;
  }

  // Pas d'utilisateur après vérification -> redirection
  if (!utilisateur) {
    return <Navigate to="/login" replace />;
  }

  // Utilisateur connecté : on affiche la page demandée
  return children;
}
