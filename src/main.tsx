import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/** En desarrollo el Service Worker puede cachear chunks viejos y romper React; solo activar PWA en producción. */
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
