import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import axios from 'axios'
import './App.css'
import SearchPage from './pages/SearchPage'
import DashboardPage from './pages/DashboardPage'
import WatchlistPage from './pages/WatchlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(userData)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common.Authorization
  }

  if (loading) {
    return <div className="loading-screen">Loading your marketplace…</div>
  }

  return (
    <Router>
      <div className={`app-shell ${user?.role === 'store_owner' ? 'seller-mode' : 'customer-mode'}`}>
        <header className="topbar">
          <div className="brand-lockup">
            <NavLink to="/" className="navbar-brand">
              <span className="brand-badge">RT</span>
              <div>
                <strong>RetailTech</strong>
                <span>{user?.role === 'store_owner' ? 'Seller Console' : 'Discover local deals fast'}</span>
              </div>
            </NavLink>
          </div>

          <nav className="nav-links">
            <NavLink to="/">Discover</NavLink>
            {user?.role === 'store_owner' && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && <NavLink to="/watchlist">Watchlist</NavLink>}
          </nav>

          <div className="topbar-actions">
            <button onClick={toggleTheme} className="theme-toggle-btn" type="button">
              {theme === 'light' ? 'Dark' : 'Light'} mode
            </button>
            {user ? (
              <>
                <div className="user-pill">
                  <span className="user-pill-label">Signed in as</span>
                  <strong>{user.username || user.email || 'User'}</strong>
                </div>
                <button onClick={handleLogout} className="logout-btn" type="button">Logout</button>
              </>
            ) : (
              <div className="auth-actions">
                <NavLink to="/login" className="ghost-link">Login</NavLink>
                <NavLink to="/register" className="cta-link">Register</NavLink>
              </div>
            )}
          </div>
        </header>

        <main className="page-shell">
          <Routes>
            <Route path="/" element={<SearchPage user={user} />} />
            <Route path="/login" element={<LoginPage setUser={setUser} />} />
            <Route path="/register" element={<RegisterPage setUser={setUser} />} />
            {user && user.role === 'store_owner' && (
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
            )}
            {user && <Route path="/watchlist" element={<WatchlistPage user={user} />} />}
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
