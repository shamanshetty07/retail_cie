import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './config';
import './App.css';

import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WatchlistPage from './pages/WatchlistPage';

function Navigation({ user, handleLogout }) {
  return (
    <header className="topbar">
      <Link to="/" className="navbar-brand">
        <div className="brand-badge">R</div>
        <div>
          <strong>RetailTech</strong>
          <span>Local Discovery</span>
        </div>
      </Link>
      
      <nav className="nav-links">
        <Link to="/">Search</Link>
        {user && <Link to="/watchlist">Watchlist</Link>}
        {user?.role === 'store_owner' && <Link to="/dashboard">Dashboard</Link>}
      </nav>

      <div className="auth-actions">
        {user ? (
          <>
            <span className="user-pill-label">Hi, {user.username}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="ghost-link">Log in</Link>
            <Link to="/register" className="cta-link">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
      
      // Optionally verify token with backend
      axios.get(`${API_BASE_URL}/auth/profile`)
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
    window.location.href = '/'; // redirect to home
  };

  if (loading) {
    return <div className="loading-screen">Starting application...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navigation user={user} handleLogout={handleLogout} />
        <main className="page-shell">
          <Routes>
            <Route path="/" element={<SearchPage user={user} />} />
            <Route path="/login" element={<LoginPage setUser={setUser} />} />
            <Route path="/register" element={<RegisterPage setUser={setUser} />} />
            <Route path="/dashboard" element={<DashboardPage user={user} />} />
            <Route path="/watchlist" element={<WatchlistPage user={user} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
