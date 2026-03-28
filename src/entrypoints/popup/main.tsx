import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@popup/App';
import '@popup/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
