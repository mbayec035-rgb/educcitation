// Page profil : route protégée (voir ProtectedRoute.jsx).
// Les données viennent de GET /profil, appelées au chargement
// par AuthContext avec le token stocké dans le navigateur.

import { useAuth } from '../AuthContext.jsx';

export default function Profil() {
  const { utilisateur } = useAuth();

  // Sécurité : ne devrait jamais arriver, ProtectedRoute bloque avant
  if (!utilisateur) {
    return <p className="chargement">Chargement...</p>;
  }

  // created_at vient de PostgreSQL au format ISO : on l'affiche en français
  const dateCreation = new Date(utilisateur.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="carte">
      <h1>Mon profil</h1>

      <div className="profil-entete">
        <div className="avatar">{(utilisateur.nom || utilisateur.email).charAt(0).toUpperCase()}</div>
        <div>
          <p className="profil-nom">{utilisateur.nom || '—'}</p>
          <p className="profil-email">{utilisateur.email}</p>
        </div>
      </div>

      <dl className="profil-infos">
        <div>
          <dt>ID</dt>
          <dd>{utilisateur.id}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{utilisateur.email}</dd>
        </div>
        <div>
          <dt>Compte créé le</dt>
          <dd>{dateCreation}</dd>
        </div>
      </dl>

      <p className="note">
        Cette page est protégée : sans token valide dans le navigateur, elle est inaccessible.
      </p>
    </section>
  );
}
