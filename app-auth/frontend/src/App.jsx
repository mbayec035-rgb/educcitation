// Définition des pages de l'application (React Router)

import { Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Accueil from './pages/Accueil.jsx';
import Login from './pages/Login.jsx';
import Profil from './pages/Profil.jsx';
import Register from './pages/Register.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function App() {
  return (
    <>
      {/* La barre de navigation est affichée sur toutes les pages */}
      <Navbar />

      <main className="conteneur">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Route protégée : renvoie vers /login si non connecté */}
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <Profil />
              </ProtectedRoute>
            }
          />

          {/* Route inconnue -> on renvoie vers l'accueil */}
          <Route path="*" element={<Accueil />} />
        </Routes>
      </main>
    </>
  );
}
