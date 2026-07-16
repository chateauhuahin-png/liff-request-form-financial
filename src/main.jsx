import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { initLiff } from './liff.js';

// ต้อง init LIFF ให้เสร็จก่อน render หน้าจอ ไม่งั้น liff.getProfile() จะยังใช้ไม่ได้
initLiff().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
