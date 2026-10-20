// Point d'entrée de l'application React
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter est indispensable : il gère les URL propres (/login, /profil...) */}
    <BrowserRouter>
      {/* AuthProvider donne le token et l'utilisateur à toute l'application */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
