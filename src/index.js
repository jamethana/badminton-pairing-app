import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/badminton-pairing-app">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:sessionName" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
); 