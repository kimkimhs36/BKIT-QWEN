import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {});
  });

import './visual-v2.css';
import './soft-ui.css';
import './liquid-v6.css';
import './ios-ready.css';
import './research-now.css';
import './capture-v2.css';
import './quality-v10.css';
import './dock-viewport-fix.css';
import './cloud-sync.css';

import './assistant.css';
import './nature.css';

import './atelier.css';

import './clarity.css';

import './sleep-guard.css';
import './experience.css';

import './learning-engine.css';
import './dark-mode.css';

import './themes/materials.css';
import './themes/material-experience.css';
