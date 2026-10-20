// Page de connexion : formulaire email + mot de passe.
// État de chargement pendant l'envoi + affichage des erreurs de l'API.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function gererEnvoi(evenement) {
    evenement.preventDefault();
    setErreur('');
    setEnvoiEnCours(true);

    try {
      await login(email, motDePasse);
      navigate('/profil');
    } catch (err) {
      // Ex: "Email ou mot de passe incorrect."
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="carte">
      <h1>Connexion</h1>

      {erreur && <p className="alerte">{erreur}</p>}

      <form onSubmit={gererEnvoi} className="formulaire">
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
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Votre mot de passe"
        />

        <button type="submit" className="btn" disabled={envoiEnCours}>
          {envoiEnCours ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="lien-bas">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </section>
  );
}
