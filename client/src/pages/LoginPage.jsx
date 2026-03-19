import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })

      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      setUser(user)
      navigate('/')
    } catch (err) {
      const apiError = err.response?.data
      if (apiError?.message) {
        setError(apiError.message)
      } else if (apiError?.errors?.length) {
        setError(apiError.errors.map((e) => e.msg).join(', '))
      } else {
        setError('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-aside card-gradient">
          <span className="section-kicker">Welcome back</span>
          <h1>Pick up where you left off.</h1>
          <p>Compare local prices, manage stores, and keep your watchlist synced in one place.</p>
          <ul className="auth-benefits">
            <li>Fast nearby product discovery</li>
            <li>Seller dashboard for store owners</li>
            <li>Live watchlist and price-drop tracking</li>
          </ul>

          <div className="loadingspinner" style={{ marginTop: '2rem' }}>
            <div id="square1"></div>
            <div id="square2"></div>
            <div id="square3"></div>
            <div id="square4"></div>
            <div id="square5"></div>
          </div>
        </section>

        <section className="auth-container auth-card">
          <h2>Login</h2>
          <p className="auth-subtitle">Use your account to enter the marketplace.</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
          <p className="auth-link">
            Don&apos;t have an account? <Link to="/register">Register here</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
