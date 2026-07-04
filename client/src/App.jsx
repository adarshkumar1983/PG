import React, { useState } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Automatically handle expired tokens or secret key changes by resetting the session on 401
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 && typeof args[0] === 'string' && !args[0].includes('/api/auth/login')) {
    localStorage.removeItem('stayzen-session');
    window.location.reload();
  }
  return response;
};

/**
 * Root App component acting as the client-side router
 */
function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stayzen-session'));
    } catch {
      return null;
    }
  });

  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) return 'accept-invite';
    return 'login';
  });

  const handleLogin = (value) => {
    localStorage.setItem('stayzen-session', JSON.stringify(value));
    setSession(value);
  };

  const handleLogout = () => {
    localStorage.removeItem('stayzen-session');
    setSession(null);
    setView('login');
  };

  if (session) {
    return <Dashboard session={session} onLogout={handleLogout} />;
  }

  switch (view) {
    case 'register':
      return <Register onSwitchView={() => setView('login')} />;
    case 'accept-invite':
      return <AcceptInvite onSwitchView={() => setView('login')} />;
    case 'login':
    default:
      return <Login onLogin={handleLogin} onSwitchView={() => setView('register')} />;
  }
}

export default App;
