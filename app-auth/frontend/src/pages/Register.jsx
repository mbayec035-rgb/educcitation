// Page d'inscription : formulaire avec nom, email et mot de passe.
// État de chargement pendant l'envoi + affichage des erreurs de l'API.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function gererEnvoi(evenement) {
    evenement.preventDefault(); // empêche le rechargement de la page
    setErreur('');
    setEnvoiEnCours(true);

    try {
      await register(nom, email, motDePasse);
      // register() se connecte automatiquement → on va sur le profil
      navigate('/profil');
    } catch (err) {
      // Message d'erreur renvoyé par l'API (ex: "Cet email est déjà utilisé.")
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false); // dans tous les cas, on réactive le bouton
    }
  }

  return (
    <section className="carte">
      <h1>Créer un compte</h1>

      {erreur && <p className="alerte">{erreur}</p>}

      <form onSubmit={gererEnvoi} className="formulaire">
        <label htmlFor="nom">Nom</label>
        <input
          id="nom"
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Amina"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="amina@email.com"
        />

        <label htmlFor="motDePasse">Mot de passe</label>
        <input
          id="motDePasse"
          type="password"
          required
          minLength={6}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="6 caractères minimum"
        />

        <button type="submit" className="btn" disabled={envoiEnCours}>
          {envoiEnCours ? 'Inscription...' : "S'inscrire"}
        </button>
      </form>

      <p className="lien-bas">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </section>
  );
}
