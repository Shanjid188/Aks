import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { initTracking } from './lib/tracking';
import { captureAttribution } from './lib/tracking/attribution';

// Notes the campaign / referrer this visit came from (before any route change).
captureAttribution();
// Loads Meta Pixel / GA4 only if the shopper has already consented (idle, non-blocking).
initTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
