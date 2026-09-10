import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { ErrorBoundary } from '../popup/ErrorBoundary.js';
import '../ui/theme.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
