import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import './globals.css';
import { initAppearance } from './appearance.js';

// Before the first render, so the panel never paints in the wrong theme.
initAppearance();

// Hold a port to the background while the panel is open, so the floating panel
// on x.com knows to step back to its bubble. Reconnect if the service worker
// restarts underneath us.
const announceOpen = () => {
  const port = chrome.runtime.connect({ name: 'sidepanel' });
  port.onDisconnect.addListener(() => setTimeout(announceOpen, 1000));
};
announceOpen();

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
