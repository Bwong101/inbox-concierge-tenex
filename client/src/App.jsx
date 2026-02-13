import { useState, useEffect } from 'react';
import { fetchJSON } from './api';
import LoginPage from './components/LoginPage';
import EmailDashboard from './components/EmailDashboard';
import LoadingState from './components/LoadingState';

export default function App() {
  const [auth, setAuth] = useState(null); // null = loading, false = not auth'd, object = auth'd

  useEffect(() => {
    fetchJSON('/auth/status')
      .then(data => setAuth(data.authenticated ? data : false))
      .catch(() => setAuth(false));
  }, []);

  if (auth === null) return <LoadingState message="Checking authentication..." />;
  if (!auth) return <LoginPage />;
  return <EmailDashboard userEmail={auth.email} onLogout={() => setAuth(false)} />;
}
