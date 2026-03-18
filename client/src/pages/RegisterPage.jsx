import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'

function RegisterPage({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'shopper'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
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
        setError('Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-aside seller-auth-aside">
          <span className="section-kicker">Create an account</span>
          <h1>Join as a shopper or run your store.</h1>
          <p>Pick your role now — the UI adapts to customer discovery or seller operations automatically.</p>
          <div className="role-preview-grid">
            <div className="role-preview-card">
              <strong>Shopper</strong>
              <span>Search-first, map-led experience</span>
            </div>
            <div className="role-preview-card">
              <strong>Store owner</strong>
              <span>Inventory, storefront and pricing control</span>
            </div>
          </div>
        </section>

        <section className="auth-container auth-card">
          <h2>Register</h2>
          <p className="auth-subtitle">Start using RetailTech in under a minute.</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="shopper">Shopper</option>
                <option value="store_owner">Store Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Registering…' : 'Create account'}
            </button>
          </form>
          <p className="auth-link">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default RegisterPage
