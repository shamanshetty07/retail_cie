import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { API_BASE_URL, SOCKET_URL } from '../config'

function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTarget, setEditingTarget] = useState({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    const newSocket = io(SOCKET_URL)

    newSocket.on('connect', () => {
      if (token) newSocket.emit('authenticate', token)
    })

    newSocket.on('priceDrop', (data) => {
      setNotifications((prev) => [...prev, { id: Date.now(), ...data }])
    })

    fetchWatchlist()

    return () => {
      newSocket.close()
    }
  }, [])

  const fetchWatchlist = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const watchlistsData = response.data.watchlists || []
      setWatchlists(watchlistsData)

      const alerts = watchlistsData.flatMap(wl => (wl.recentAlerts || []).map(a => ({
        id: a._id || Date.now() + Math.random(),
        productName: a.productName,
        newPrice: a.newPrice,
        storeName: a.storeName,
        createdAt: new Date(a.createdAt)
      })))
      
      alerts.sort((a,b) => b.createdAt - a.createdAt)
      
      setNotifications(prev => {
        const merged = [...alerts, ...prev]
        // Remove duplicates by id
        return Array.from(new Map(merged.map(item => [item.id, item])).values())
      })
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveProduct = async (watchlistId, productId) => {
    try {
      await axios.delete(`${API_BASE_URL}/watchlist/${watchlistId}/products/${productId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setWatchlists((prev) => prev.map((watchlist) => {
        if (watchlist._id !== watchlistId) return watchlist
        return {
          ...watchlist,
          products: (watchlist.products || []).filter((item) => item.product?._id !== productId)
        }
      }).filter((watchlist) => (watchlist.products || []).length > 0))
    } catch (error) {
      alert('Failed to remove item from watchlist')
    }
  }

  const updateTargetPrice = async (watchlistId, productId, targetPrice) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const watchlist = watchlists.find((item) => item._id === watchlistId)
      if (!watchlist) return

      const response = await axios.put(
        `${API_BASE_URL}/watchlist/${watchlistId}`,
        {
          name: watchlist.name,
          description: watchlist.description,
          products: watchlist.products.map((item) => ({
            product: item.product?._id,
            targetPrice: item.product?._id === productId ? Number(targetPrice) : item.targetPrice
          }))
        },
        { headers }
      )

      setWatchlists((prev) => prev.map((item) => item._id === watchlistId ? response.data.watchlist : item))
      setEditingTarget((prev) => ({ ...prev, [`${watchlistId}-${productId}`]: String(targetPrice) }))
    } catch (error) {
      alert('Failed to update target price')
    }
  }

  const watchlistItems = watchlists.flatMap((watchlist) =>
    (watchlist.products || []).map((item) => ({
      watchlistId: watchlist._id,
      watchlistName: watchlist.name,
      product: item.product,
      targetPrice: item.targetPrice,
      addedAt: item.addedAt
    }))
  )

  if (loading) return <div className="loading-screen">Loading watchlist…</div>

  return (
    <div className="watchlist-page">
      <section className="watchlist-hero card-gradient alt-gradient">
        <div>
          <span className="section-kicker">Saved tracking</span>
          <h1>Watchlist and alerts</h1>
          <p>Keep tabs on price drops and revisit saved items without starting your search from scratch.</p>
        </div>
        <div className="watchlist-stat-row">
          <div className="summary-card">
            <span>viewed items</span>
            <strong>{watchlistItems.length}</strong>
            <p>Saved products</p>
          </div>
          <div className="summary-card">
            <span>Alerts received</span>
            <strong>{notifications.length}</strong>
            <p>Live price drop events</p>
          </div>
        </div>
      </section>

      <div className="watchlist-container redesigned-watchlist-grid">
        <section className="notifications card-surface">
          <h2>Price drop alerts</h2>
          {notifications.length === 0 ? (
            <p className="muted-copy">No price drop notifications yet.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div key={notif.id} className="notification-item">
                  <strong>{notif.product?.name || notif.productName || 'Product'}</strong>
                  <p>Dropped to ₹{notif.newPrice} at {notif.storeName || 'a store'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="watchlist-items card-surface">
          <h2>Watched products</h2>
          {watchlistItems.length === 0 ? (
            <p className="muted-copy">Your watchlist is empty.</p>
          ) : (
            <div className="items-grid watchlist-card-grid">
              {watchlistItems.map((item) => {
                const key = `${item.watchlistId}-${item.product?._id}`
                const targetValue = editingTarget[key] ?? (item.targetPrice ?? '')

                return (
                  <article key={key} className="watchlist-item enhanced-watchlist-item">
                    <div className="watchlist-item-top">
                      <h3>{item.product?.name || 'Untitled product'}</h3>
                      <span className="store-category-pill">{item.watchlistName}</span>
                    </div>
                    <p>Category: {item.product?.category || 'Uncategorized'}</p>
                    <div className="target-price-editor">
                      <label>Target Price (₹)</label>
                      <div className="target-price-row">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={targetValue}
                          onChange={(e) => setEditingTarget((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Set target price"
                        />
                        <button
                          type="button"
                          className="secondary-inline-btn"
                          onClick={() => updateTargetPrice(item.watchlistId, item.product?._id, targetValue)}
                        >
                          Save target
                        </button>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveProduct(item.watchlistId, item.product?._id)} className="remove-btn" type="button">
                      Remove from Watchlist
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default WatchlistPage
