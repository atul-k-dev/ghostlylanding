import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import './globals.css';
import { initAppearance } from './appearance.js';

// Before the first render, so the panel never paints in the wrong theme.
initAppearance();

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
