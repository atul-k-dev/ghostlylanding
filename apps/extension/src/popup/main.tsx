import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
