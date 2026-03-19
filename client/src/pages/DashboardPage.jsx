import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import MapPicker from '../components/MapPicker'

function DashboardPage({ user }) {
  const [stores, setStores] = useState([])
  const [products, setProducts] = useState([])
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedStore, setSelectedStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [storeData, setStoreData] = useState({
    name: '',
    address: '',
    category: 'other',
    lat: null,
    lng: null
  })

  const [productData, setProductData] = useState({
    name: '',
    price: '',
    category: 'other',
    imageUrl: ''
  })
  const [updatingProductId, setUpdatingProductId] = useState(null)
  const [imageInputFor, setImageInputFor] = useState(null)   // productId with open image input
  const [imageUrlDraft, setImageUrlDraft] = useState('')

  useEffect(() => {
    fetchStores()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedStore) {
      fetchStoreProducts(selectedStore._id)
    }
  }, [selectedStore]) // eslint-disable-line react-hooks/exhaustive-deps

  const getApiError = (error, fallback) => {
    const apiError = error.response?.data
    if (apiError?.message) return apiError.message
    if (apiError?.errors?.length) return apiError.errors.map((e) => e.msg).join(', ')
    return fallback
  }

  const fetchStores = async () => {
    try {
      setError('')
      const response = await axios.get(`${API_BASE_URL}/stores/owner/my-stores`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setStores(response.data.stores || [])
      if (response.data.stores?.length > 0) {
        setSelectedStore(response.data.stores[0])
      } else {
        setSelectedStore(null)
      }
    } catch (error) {
      setError(getApiError(error, 'Failed to fetch stores'))
    } finally {
      setLoading(false)
    }
  }

  const fetchStoreProducts = async (storeId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stores/${storeId}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setProducts(response.data.products || [])
    } catch (error) {
      setProducts([])
      setError(getApiError(error, 'Failed to fetch products'))
    }
  }

  const handleCreateStore = async (e) => {
    e.preventDefault()
    setError('')

    if (user?.role !== 'store_owner') {
      setError('Only store owners can create stores. Register as a store owner account.')
      return
    }

    if (navigator.geolocation && (!storeData.lat || !storeData.lng)) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStoreData((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }))
          submitStore(position.coords.latitude, position.coords.longitude)
        },
        () => {
          setError('Location access is required to create a store. Please allow location and try again.')
        }
      )
    } else {
      submitStore(storeData.lat, storeData.lng)
    }
  }

  const submitStore = async (lat, lng) => {
    try {
      const payload = {
        name: storeData.name,
        category: storeData.category,
        location: {
          coordinates: [lng, lat],
          address: { street: storeData.address }
        }
      }

      await axios.post(`${API_BASE_URL}/stores`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      setShowStoreForm(false)
      setStoreData({ name: '', address: '', category: 'other', lat: null, lng: null })
      fetchStores()
    } catch (error) {
      setError(getApiError(error, 'Failed to create store'))
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedStore) {
      setError('Please select a store first')
      return
    }

    try {
      await axios.post(
        `${API_BASE_URL}/stores/${selectedStore._id}/products`,
        { ...productData, price: Number(productData.price) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      setShowProductForm(false)
      setProductData({ name: '', price: '', category: 'other', imageUrl: '' })
      fetchStoreProducts(selectedStore._id)
    } catch (error) {
      setError(getApiError(error, 'Failed to create product'))
    }
  }

  const updateProductPrice = async (product, delta) => {
    if (!selectedStore) return

    const nextPrice = Number((Number(product.price || 0) + delta).toFixed(2))
    if (nextPrice < 0) {
      setError('Price cannot go below 0')
      return
    }

    try {
      setError('')
      setUpdatingProductId(product._id)
      const response = await axios.put(
        `${API_BASE_URL}/stores/${selectedStore._id}/products/${product._id}`,
        { price: nextPrice },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      setProducts((prev) => prev.map((item) => (item._id === product._id ? response.data.product : item)))
    } catch (error) {
      setError(getApiError(error, 'Failed to update product price'))
    } finally {
      setUpdatingProductId(null)
    }
  }

  const updateProductImage = async (product) => {
    const url = imageUrlDraft.trim()
    if (!url) return
    try {
      setError('')
      setUpdatingProductId(product._id)
      const response = await axios.put(
        `${API_BASE_URL}/stores/${selectedStore._id}/products/${product._id}`,
        { imageUrl: url },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      setProducts((prev) => prev.map((item) => (item._id === product._id ? response.data.product : item)))
      setImageInputFor(null)
      setImageUrlDraft('')
    } catch (error) {
      setError(getApiError(error, 'Failed to update product image'))
    } finally {
      setUpdatingProductId(null)
    }
  }

  const catalogValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price || 0), 0),
    [products]
  )

  if (loading) return <div className="loading-screen">Loading seller operations…</div>

  return (
    <div className="dashboard-page seller-dashboard">
      <section className="seller-header">
        <div>
          <span className="section-kicker">Operations view</span>
          <h1>Store dashboard</h1>
          <p>Manage inventory, locations, and pricing from one clean operational workspace.</p>
        </div>

        <div className="seller-header-actions">
          <button onClick={() => setShowStoreForm((prev) => !prev)} className="btn seller-primary-btn" type="button">
            {showStoreForm ? 'Close store form' : 'Add new store'}
          </button>
          {selectedStore && (
            <button onClick={() => setShowProductForm((prev) => !prev)} className="btn seller-secondary-btn" type="button">
              {showProductForm ? 'Close product form' : 'Add product'}
            </button>
          )}
        </div>
      </section>

      {error && <div className="error-message seller-error">{error}</div>}

      <section className="seller-metrics">
        <div className="metric-card">
          <span>Total stores</span>
          <strong>{stores.length}</strong>
          <p>Your operating footprint</p>
        </div>
        <div className="metric-card">
          <span>Products in selected store</span>
          <strong>{products.length}</strong>
          <p>{selectedStore ? selectedStore.name : 'Pick a store to inspect catalog'}</p>
        </div>
        <div className="metric-card">
          <span>Catalog value snapshot</span>
          <strong>${catalogValue.toFixed(2)}</strong>
          <p>Sum of visible product prices</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <aside className="seller-sidebar card-surface-dark">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Stores</span>
              <h2>Your locations</h2>
            </div>
          </div>

          {showStoreForm && (
            <form onSubmit={handleCreateStore} className="form seller-form">
              <div className="seller-form-grid">
                <input
                  type="text"
                  placeholder="Store Name"
                  value={storeData.name}
                  onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={storeData.address}
                  onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                  required
                />
                <select
                  value={storeData.category}
                  onChange={(e) => setStoreData({ ...storeData, category: e.target.value })}
                >
                  <option value="other">Other</option>
                  <option value="grocery">Grocery</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>
              <MapPicker
                position={{ lat: storeData.lat, lng: storeData.lng }}
                onChange={({ lat, lng }) => setStoreData((prev) => ({ ...prev, lat, lng }))}
              />
              <div className="coordinates-preview">
                {storeData.lat && storeData.lng
                  ? `Pinned at ${storeData.lat.toFixed(5)}, ${storeData.lng.toFixed(5)}`
                  : 'Drop a pin or allow location to set your storefront.'}
              </div>
              <div className="inline-form-actions">
                <button type="submit">Create store</button>
                <button type="button" onClick={() => setShowStoreForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="seller-store-list">
            {stores.length === 0 ? (
              <div className="seller-empty">No stores yet. Add your first storefront to begin.</div>
            ) : (
              stores.map((store) => (
                <button
                  key={store._id}
                  type="button"
                  className={`store-item seller-store-item ${selectedStore?._id === store._id ? 'active' : ''}`}
                  onClick={() => setSelectedStore(store)}
                >
                  <div>
                    <h3>{store.name}</h3>
                    <p>{store.location?.address?.street || 'No address'}</p>
                  </div>
                  <span className="store-category-pill">{store.category || 'other'}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="seller-main card-surface-dark">
          <div className="panel-header seller-main-header">
            <div>
              <span className="section-kicker">Inventory</span>
              <h2>{selectedStore ? selectedStore.name : 'Select a store'}</h2>
              <p>{selectedStore ? 'Track what shoppers will see in search results.' : 'Choose a store from the left panel.'}</p>
            </div>
          </div>

          {showProductForm && selectedStore && (
            <form onSubmit={handleCreateProduct} className="form seller-form compact-form">
              <div className="seller-form-grid three-col">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={productData.price}
                  onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                  required
                />
                <select
                  value={productData.category}
                  onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                >
                  <option value="food">Food</option>
                  <option value="beverages">Beverages</option>
                  <option value="household">Household</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="url"
                  placeholder="Image URL (optional)"
                  value={productData.imageUrl}
                  onChange={(e) => setProductData({ ...productData, imageUrl: e.target.value })}
                />
              </div>
              <div className="inline-form-actions">
                <button type="submit">Create product</button>
                <button type="button" onClick={() => setShowProductForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="products-list seller-product-list">
            {products.length === 0 ? (
              <div className="seller-empty">No products in this store yet.</div>
            ) : (
              products.map((product) => {
                const hasImage = !!product.images?.[0]?.url
                const isImageOpen = imageInputFor === product._id
                return (
                  <article key={product._id} className="product-item seller-product-item">
                    <div className="seller-product-info">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={hasImage ? product.images[0].url : 'https://placehold.co/96x96/1e293b/94a3b8?text=Item'}
                          alt={product.images?.[0]?.alt || product.name}
                          className="product-thumb"
                          style={{ opacity: hasImage ? 1 : 0.45 }}
                        />
                        {!hasImage && !isImageOpen && (
                          <button
                            type="button"
                            title="Add image"
                            onClick={() => { setImageInputFor(product._id); setImageUrlDraft('') }}
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              background: 'rgba(0,0,0,0.55)',
                              border: '2px dashed rgba(255,255,255,0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              gap: '2px', color: '#fff', fontSize: '0.6rem',
                              fontWeight: 600, letterSpacing: '0.03em'
                            }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>📷</span>
                            Add
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4>{product.name}</h4>
                        <p>Category: {product.category}</p>
                        {hasImage && !isImageOpen && (
                          <button
                            type="button"
                            className="secondary-inline-btn"
                            style={{ marginTop: '0.35rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                            onClick={() => { setImageInputFor(product._id); setImageUrlDraft(product.images[0].url) }}
                          >
                            Change image
                          </button>
                        )}
                        {isImageOpen && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <input
                              type="url"
                              placeholder="Paste image URL…"
                              value={imageUrlDraft}
                              onChange={(e) => setImageUrlDraft(e.target.value)}
                              autoFocus
                              style={{
                                width: '100%', padding: '0.4rem 0.6rem',
                                borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.06)', color: 'inherit',
                                fontSize: '0.8rem'
                              }}
                            />
                            {imageUrlDraft && (
                              <img
                                src={imageUrlDraft}
                                alt="preview"
                                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)' }}
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            )}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                                disabled={updatingProductId === product._id || !imageUrlDraft.trim()}
                                onClick={() => updateProductImage(product)}
                              >
                                {updatingProductId === product._id ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="secondary-inline-btn"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                                onClick={() => { setImageInputFor(null); setImageUrlDraft('') }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  <div className="product-price-block">
                    <strong>₹{Number(product.price).toFixed(2)}</strong>
                    <span>current price</span>
                    <div className="price-adjuster">
                      <button
                        type="button"
                        className="price-adjust-btn"
                        disabled={updatingProductId === product._id}
                        onClick={() => updateProductPrice(product, -1)}
                      >
                        - ₹1
                      </button>
                      <button
                        type="button"
                        className="price-adjust-btn"
                        disabled={updatingProductId === product._id}
                        onClick={() => updateProductPrice(product, 1)}
                      >
                        + ₹1
                      </button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
