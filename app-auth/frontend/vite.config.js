// Configuration de Vite (l'outil qui lance et compile le frontend)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // port utilisé pendant le développement en local
  },
});
