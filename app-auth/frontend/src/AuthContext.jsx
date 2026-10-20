// ============================================================
// AuthContext : gère l'état de connexion de l'application.
// - garde le token JWT dans le localStorage du navigateur
// - expose : utilisateur, token, chargement, login(), register(), logout()
// ============================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// URL du backend, définie dans le fichier .env (VITE_API_URL)
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// L'objet "contexte" que tous les composants pourront lire
const AuthContext = createContext(null);

// Petit helper : lire la réponse JSON même si le serveur renvoie une erreur
async function lireJson(reponse) {
  try {
    return await reponse.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  // useState avec une fonction = valeur initiale lue UNE seule fois au chargement
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  // --------------------------------------------------------
  // Au chargement de l'application : si un token existe déjà
  // dans le navigateur, on vérifie qu'il est toujours valide
  // en appelant GET /profil.
  // --------------------------------------------------------
  useEffect(() => {
    // "ignore" évite de mettre à jour l'état si le composant est démonté
    let ignore = false;
    setChargement(true);

    if (!token) {
      // Pas de token : pas d'appel réseau, on n'est pas connecté
      setUtilisateur(null);
      setChargement(false);
      return () => {
        ignore = true;
      };
    }

    (async () => {
      try {
        const reponse = await fetch(`${API}/profil`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 401 = token expiré (7 jours) ou invalide → on déconnecte
        if (reponse.status === 401) {
          localStorage.removeItem('token');
          if (!ignore) {
            setToken(null);
            setUtilisateur(null);
          }
          return;
        }

        // Autre erreur (500, réseau...) : on ne change pas l'état
        if (!reponse.ok) return;

        const donnees = await reponse.json();
        if (!ignore) setUtilisateur(donnees);
      } catch (erreur) {
        console.error('Impossible de vérifier le token :', erreur);
      } finally {
        if (!ignore) setChargement(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [token]); // se relance à chaque fois que "token" change

  // --------------------------------------------------------
  // login(email, password) -> POST /login
  // En cas de succès : on stocke le token et on re-télécharge
  // le profil (l'effet ci-dessus se relance grâce à setToken).
  // En cas d'erreur : on lève une Error avec le message de l'API.
  // --------------------------------------------------------
  const login = useCallback(async (email, password) => {
    const reponse = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const donnees = await lireJson(reponse);
    if (!reponse.ok) {
      throw new Error(donnees.message || 'Connexion impossible, réessayez.');
    }

    // On passe "chargement" à true AVANT de changer le token :
    // comme ça ProtectedRoute n'a jamais l'occasion de rediriger
    // vers /login pendant le temps que /profil met à répondre.
    setChargement(true);
    localStorage.setItem('token', donnees.token);
    setToken(donnees.token);
  }, []);

  // --------------------------------------------------------
  // register(nom, email, password) -> POST /register
  // Si l'inscription réussit, on connecte directement l'utilisateur.
  // --------------------------------------------------------
  const register = useCallback(
    async (nom, email, password) => {
      const reponse = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, password }),
      });

      const donnees = await lireJson(reponse);
      if (!reponse.ok) {
        throw new Error(donnees.message || 'Inscription impossible, réessayez.');
      }

      // Connexion automatique après une inscription réussie
      await login(email, password);
    },
    [login]
  );

  // --------------------------------------------------------
  // logout() -> oublie tout localement (le serveur n'est pas touché,
  // car le token n'est stocké nulle part côté serveur)
  // --------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUtilisateur(null);
  }, []);

  // useMemo : la valeur ne change que si l'une de ses dépendances change
  const valeur = useMemo(
    () => ({ token, utilisateur, chargement, login, register, logout }),
    [token, utilisateur, chargement, login, register, logout]
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// Hook personnalisé : const { utilisateur } = useAuth();
export function useAuth() {
  const contexte = useContext(AuthContext);
  if (!contexte) {
    throw new Error('useAuth() doit être utilisé dans <AuthProvider>.');
  }
  return contexte;
}
