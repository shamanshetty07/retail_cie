import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import SearchResultsMap from '../components/SearchResultsMap'

const discoveryCategories = [
  { label: 'Fresh grocery', query: 'milk' },
  { label: 'Quick snacks', query: 'chips' },
  { label: 'Electronics', query: 'charger' },
  { label: 'Home needs', query: 'detergent' },
  { label: 'Pharmacy', query: 'vitamins' },
  { label: 'Beverages', query: 'juice' }
]

const SEARCH_CACHE_KEY = 'retailtech_search_cache'

function loadSearchCache() {
  try {
    const raw = sessionStorage.getItem(SEARCH_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSearchCache(data) {
  try {
    sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save search cache:', err)
  }
}

function SearchPage({ user }) {
  const navigate = useNavigate()
  const cache = loadSearchCache()
  const [searchQuery, setSearchQuery] = useState(cache?.searchQuery ?? '')
  const [products, setProducts] = useState(cache?.products ?? [])
  const [loading, setLoading] = useState(false)
  const [radius, setRadius] = useState(cache?.radius ?? 10)
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null })
  const [useLocation, setUseLocation] = useState(true)
  const [highlightedStoreKey, setHighlightedStoreKey] = useState(null)
  const [savingWatchlistId, setSavingWatchlistId] = useState(null)
  const [openReviewsFor, setOpenReviewsFor] = useState(null)
  const [reviewsByProduct, setReviewsByProduct] = useState({})
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [loadingReviewsFor, setLoadingReviewsFor] = useState(null)
  const [submittingReviewFor, setSubmittingReviewFor] = useState(null)
  const [isDefaultView, setIsDefaultView] = useState(!cache?.searchQuery)

  const vantaRef = useRef(null)
  const vantaEffect = useRef(null)

  useEffect(() => {
    if (user) return // skip Vanta if logged in
    const tryInit = () => {
      if (window.VANTA && window.THREE && vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.BIRDS({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0x0d0d1a,
          color1: 0x6c63ff,
          color2: 0x00d4ff,
          colorMode: 'variance',
          birdSize: 1.2,
          wingSpan: 28,
          speedLimit: 5,
          separation: 60,
          alignment: 40,
          cohesion: 30,
          quantity: 4
        })
      } else if (!window.VANTA || !window.THREE) {
        setTimeout(tryInit, 100) // retry until scripts load
      }
    }
    tryInit()
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy()
        vantaEffect.current = null
      }
    }
  }, [user])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => console.log('Geolocation error:', error)
      )
    }
  }, [])

  // Auto-load all products on first visit when there's no cached search
  useEffect(() => {
    if (cache?.searchQuery) return // already have cached results
    const fetchAll = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${API_BASE_URL}/products`)
        setProducts(response.data.products || [])
        setIsDefaultView(true)
      } catch (error) {
        console.error('Default products fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const directionsUrl = (lat, lng) => {
    const destination = `${lat},${lng}`
    if (useLocation && userLocation.lat && userLocation.lng) {
      return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destination}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${destination}`
  }

  const flattenedStores = useMemo(() => (
    products.flatMap((product) => {
      const storeEntries = (product.stores || [])
        .filter((entry) => entry?.store?.location?.coordinates?.length === 2)
        .map((entry, index) => ({
          key: `${product.name}-${entry.store?._id || entry.store?.name || index}`,
          name: entry.store?.name || 'Unknown store',
          lat: entry.store.location.coordinates[1],
          lng: entry.store.location.coordinates[0],
          price: entry.price,
          distance: entry.distance,
          productName: product.name
        }))

      const cheapestPrice = storeEntries.length
        ? Math.min(...storeEntries.map((entry) => Number(entry.price)))
        : null

      return storeEntries.map((entry) => ({
        ...entry,
        isCheapest: cheapestPrice !== null && Number(entry.price) === cheapestPrice
      }))
    })
  ), [products])

  const bestDeal = useMemo(() => {
    if (!flattenedStores.length) return null
    return [...flattenedStores].sort((a, b) => Number(a.price) - Number(b.price))[0]
  }, [flattenedStores])

  const uniqueStoreCount = new Set(flattenedStores.map((store) => store.name)).size
  const averagePrice = flattenedStores.length
    ? flattenedStores.reduce((sum, store) => sum + Number(store.price), 0) / flattenedStores.length
    : null

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setHighlightedStoreKey(null)
    setIsDefaultView(false)
    try {
      const params = { q: searchQuery, radius }
      if (useLocation && userLocation.lat && userLocation.lng) {
        params.lat = userLocation.lat
        params.lng = userLocation.lng
      }

      const response = await axios.get(`${API_BASE_URL}/products/search`, { params })
      const fetchedProducts = response.data.products || []
      setProducts(fetchedProducts)
      setOpenReviewsFor(null)
      saveSearchCache({ searchQuery, radius, products: fetchedProducts })
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const runQuickSearch = (query) => {
    setSearchQuery(query)
  }

  const ensureDefaultWatchlist = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const existing = await axios.get(`${API_BASE_URL}/watchlist`, { headers })
    const firstWatchlist = existing.data.watchlists?.[0]

    if (firstWatchlist) return firstWatchlist

    const created = await axios.post(
      `${API_BASE_URL}/watchlist`,
      { name: 'My Watchlist', description: 'Saved from search results' },
      { headers }
    )

    return created.data.watchlist
  }

  const handleAddToWatchlist = async (product) => {
    if (!user) {
      alert('Please log in first to use the watchlist.')
      return
    }

    if (!product?.id) {
      alert('This result is missing a product id, so it cannot be saved yet.')
      return
    }

    setSavingWatchlistId(product.id)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const watchlist = await ensureDefaultWatchlist()
      await axios.post(
        `${API_BASE_URL}/watchlist/${watchlist._id}/products`,
        { product: product.id },
        { headers }
      )
      alert(`${product.name} added to your watchlist.`)
    } catch (error) {
      const message = error.response?.data?.message
        || error.response?.data?.errors?.map((entry) => entry.msg).join(', ')
        || 'Failed to add product to watchlist.'
      alert(message)
    } finally {
      setSavingWatchlistId(null)
    }
  }

  const fetchReviews = async (productId) => {
    setLoadingReviewsFor(productId)
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}/reviews`)
      setReviewsByProduct((prev) => ({
        ...prev,
        [productId]: response.data
      }))
    } catch (error) {
      console.error(error)
      alert('Failed to load reviews.')
    } finally {
      setLoadingReviewsFor(null)
    }
  }

  const toggleReviews = async (productId) => {
    const next = openReviewsFor === productId ? null : productId
    setOpenReviewsFor(next)
    if (next && !reviewsByProduct[productId]) {
      await fetchReviews(productId)
    }
  }

  const setReviewDraft = (productId, patch) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [productId]: {
        rating: prev[productId]?.rating || 5,
        comment: prev[productId]?.comment || '',
        ...patch
      }
    }))
  }

  const submitReview = async (productId) => {
    if (!user) {
      alert('Please log in first to leave a review.')
      return
    }

    const draft = reviewDrafts[productId] || { rating: 5, comment: '' }
    setSubmittingReviewFor(productId)
    try {
      await axios.post(
        `${API_BASE_URL}/products/${productId}/reviews`,
        draft,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      await fetchReviews(productId)
      setReviewDrafts((prev) => ({
        ...prev,
        [productId]: { rating: 5, comment: '' }
      }))
    } catch (error) {
      const message = error.response?.data?.message
        || error.response?.data?.errors?.map((entry) => entry.msg).join(', ')
        || 'Failed to save review.'
      alert(message)
    } finally {
      setSubmittingReviewFor(null)
    }
  }

  return (
    <div className={`search-page customer-home ${!user ? 'with-vanta-bg' : ''}`}>
      {!user && (
        <section
          ref={vantaRef}
          className="vanta-hero"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: '3rem'
          }}
        >
          {/* Gradient overlay for readability */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(13,13,26,0.3) 0%, rgba(13,13,26,0.7) 100%)',
            zIndex: 1
          }} />

          {/* Centered content card */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '4rem 2.5rem',
            borderRadius: '32px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            maxWidth: '520px',
            width: '90%',
            animation: 'vantaFadeIn 0.8s ease forwards'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(108,99,255,0.2)',
              border: '1px solid rgba(108,99,255,0.4)',
              borderRadius: '100px',
              padding: '0.4rem 1.2rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#a29dff',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              <span>✦</span> Local retail, reinvented
            </div>

            <h1 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              marginBottom: '1.25rem',
              letterSpacing: '-0.03em'
            }}>
              Find the best prices<br />
              <span style={{
                background: 'linear-gradient(135deg, #6c63ff, #00d4ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>near you</span>
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              fontWeight: 500
            }}>
              Compare real‑time prices across local stores,
              set price alerts, and head straight to the best deal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  display: 'inline-block',
                  padding: '1rem 3rem',
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, #6c63ff 0%, #00d4ff 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  fontFamily: 'Outfit, sans-serif',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  boxShadow: '0 12px 32px rgba(108,99,255,0.45)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  width: '100%',
                  maxWidth: '300px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.04) translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(108,99,255,0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(108,99,255,0.45)'
                }}
              >
                Get Started — Register
              </button>

              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease',
                  textDecoration: 'none'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                Already have an account? Log in →
              </button>
            </div>
          </div>

          <style>{`
            @keyframes vantaFadeIn {
              from { opacity: 0; transform: translateY(30px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </section>
      )}
      <section className="customer-hero card-gradient">
        <div className="hero-copy">
          <span className="section-kicker">Delivery-style discovery, tuned for local retail</span>
          <h1>Find nearby stores, compare prices, and head straight to the best deal.</h1>
          <p>
            Search like a food app, but for retail essentials. Spot the cheapest store, compare distance,
            and jump into directions without losing the bigger picture.
          </p>

          <form onSubmit={handleSearch} className="discovery-search-panel">
            <div className="search-bar-row">
              <div className="search-field search-field-large">
                <label>What are you looking for?</label>
                <input
                  type="text"
                  placeholder="Try milk, headphones, detergent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="search-field search-field-compact">
                <label>Radius</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="radius-input"
                />
              </div>

              <button type="submit" disabled={loading} className="search-btn hero-search-btn">
                {loading ? 'Searching…' : 'Explore deals'}
              </button>
            </div>

            <div className="hero-search-footer">
              <label className="location-toggle">
                <input
                  type="checkbox"
                  checked={useLocation}
                  onChange={(e) => setUseLocation(e.target.checked)}
                />
                <span>Use my live location for distance-aware results</span>
              </label>

              <div className="location-pill">
                <strong>{useLocation && userLocation.lat && userLocation.lng ? 'Location ready' : 'Location optional'}</strong>
                <span>
                  {useLocation && userLocation.lat && userLocation.lng
                    ? `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`
                    : 'Search works even without live GPS'}
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="hero-aside">
          <div className="hero-stat-card glass-card">
            <span>Best for</span>
            <strong>Fast price checks</strong>
            <p>Compare nearby stores before stepping out.</p>
          </div>
          <div className="hero-stat-grid">
            <div className="mini-stat glass-card">
              <strong>{products.length || '00'}</strong>
              <span>Products matched</span>
            </div>
            <div className="mini-stat glass-card">
              <strong>{flattenedStores.length || '00'}</strong>
              <span>Store offers</span>
            </div>
            <div className="mini-stat glass-card">
              <strong>{uniqueStoreCount || '00'}</strong>
              <span>Nearby stores</span>
            </div>
          </div>
        </div>
      </section>

      <section className="discovery-strip">
        <div>
          <span className="section-kicker">Quick discovery</span>
          <h2>Browse common searches</h2>
        </div>
        <div className="category-chip-row">
          {discoveryCategories.map((category) => (
            <button
              key={category.query}
              type="button"
              className="category-chip"
              onClick={() => runQuickSearch(category.query)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      {products.length > 0 && (
        <section className="results-hub">
          <div className="results-header">
            <div>
              <span className="section-kicker">{isDefaultView ? 'Browse' : 'Results'}</span>
              <h2>{isDefaultView ? 'All available products' : `${searchQuery} near you`}</h2>
              <p>{isDefaultView
                ? `${flattenedStores.length} price listings across ${uniqueStoreCount} stores`
                : `${flattenedStores.length} offers across ${uniqueStoreCount} stores within ${radius} km.`}
              </p>
            </div>

            <div className="results-summary-cards">
              <div className="summary-card">
                <span>Best deal</span>
                <strong>{bestDeal ? `₹${Number(bestDeal.price).toFixed(2)}` : '--'}</strong>
                <p>{bestDeal ? `${bestDeal.name} • ${bestDeal.productName}` : 'No pricing yet'}</p>
              </div>
              <div className="summary-card">
                <span>Average price</span>
                <strong>{averagePrice ? `₹${averagePrice.toFixed(2)}` : '--'}</strong>
                <p>Across all matched store listings</p>
              </div>
            </div>
          </div>

          <div className="results-layout">
            <div className="results-map-panel">
              <SearchResultsMap
                userLocation={useLocation ? userLocation : null}
                stores={flattenedStores}
                highlightedKey={highlightedStoreKey}
              />
            </div>

            <div className="results-list-panel">
              <div className="products-grid discovery-grid">
                {products.map((product, idx) => {
                  const cheapestPrice = product.stores?.length
                    ? Math.min(...product.stores.map((entry) => Number(entry.price)))
                    : null
                  const reviewState = reviewsByProduct[product.id]
                  const draft = reviewDrafts[product.id] || { rating: 5, comment: '' }

                  return (
                    <article key={idx} className="product-card result-card">
                      <div className="result-card-header">
                        <div className="result-product-head">
                          <img
                            src={product.imageUrl || 'https://placehold.co/120x120/e5e7eb/475569?text=Item'}
                            alt={product.name}
                            className="product-thumb result-product-thumb"
                          />
                          <div>
                            <span className="result-eyebrow">Product match</span>
                            <h3>{product.name}</h3>
                          </div>
                        </div>
                        <div className="result-meta-pill">
                          <strong>{product.stores?.length || 0}</strong>
                          <span>stores</span>
                        </div>
                      </div>

                      <div className="review-summary-inline">
                        <span>Reviews</span>
                        <strong>
                          {reviewState?.reviewCount
                            ? `${reviewState.averageRating.toFixed(1)} ★`
                            : 'No reviews yet'}
                        </strong>
                      </div>

                      <div className="stores-list result-store-list">
                        {product.stores && product.stores.map((entry, storeIdx) => {
                          const storeKey = `${product.name}-${entry.store?._id || entry.store?.name || storeIdx}`
                          const isCheapest = cheapestPrice !== null && Number(entry.price) === cheapestPrice
                          const lat = entry.store?.location?.coordinates?.[1]
                          const lng = entry.store?.location?.coordinates?.[0]

                          return (
                            <div
                              key={storeIdx}
                              className={`store-item rich-store-item ${isCheapest ? 'cheapest-store' : ''} ${highlightedStoreKey === storeKey ? 'selected-store' : ''}`}
                              onMouseEnter={() => setHighlightedStoreKey(storeKey)}
                            >
                              <div className="store-header">
                                <span className="store-name">
                                  {entry.store?.name || 'Unknown store'}
                                  {isCheapest ? <span className="cheapest-badge">Best price</span> : null}
                                </span>
                                <span className="price">₹{Number(entry.price).toFixed(2)}</span>
                              </div>

                              <div className="store-detail-row">
                                <span className="store-distance">
                                  {entry.distance ? `${entry.distance.toFixed(1)} km away` : 'Distance unavailable'}
                                </span>
                                <span className="store-tag">Open route</span>
                              </div>

                              {lat && lng ? (
                                <a
                                  className="directions-link"
                                  href={directionsUrl(lat, lng)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Get directions
                                </a>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>

                      <div className="result-card-actions">
                        <button
                          className="secondary-inline-btn"
                          type="button"
                          onClick={() => toggleReviews(product.id)}
                        >
                          {openReviewsFor === product.id ? 'Hide reviews' : 'Reviews'}
                        </button>

                        {user && (
                          <button
                            className="watchlist-btn"
                            type="button"
                            disabled={savingWatchlistId === product.id}
                            onClick={() => handleAddToWatchlist(product)}
                          >
                            {savingWatchlistId === product.id ? 'Saving…' : 'Add to Watchlist'}
                          </button>
                        )}
                      </div>

                      {openReviewsFor === product.id && (
                        <div className="reviews-panel">
                          {loadingReviewsFor === product.id ? (
                            <p className="muted-copy">Loading reviews…</p>
                          ) : (
                            <>
                              <div className="review-stats-row">
                                <strong>
                                  {reviewState?.reviewCount
                                    ? `${reviewState.averageRating.toFixed(1)} / 5`
                                    : 'No ratings yet'}
                                </strong>
                                <span>{reviewState?.reviewCount || 0} reviews</span>
                              </div>

                              {user ? (
                                <div className="review-form-box">
                                  <label className="review-label">Your rating</label>
                                  <select
                                    value={draft.rating}
                                    onChange={(e) => setReviewDraft(product.id, { rating: Number(e.target.value) })}
                                  >
                                    {[5, 4, 3, 2, 1].map((star) => (
                                      <option key={star} value={star}>{star} stars</option>
                                    ))}
                                  </select>
                                  <textarea
                                    placeholder="Share a quick opinion about this product"
                                    value={draft.comment}
                                    onChange={(e) => setReviewDraft(product.id, { comment: e.target.value })}
                                    rows={3}
                                  />
                                  <button
                                    type="button"
                                    className="btn"
                                    disabled={submittingReviewFor === product.id}
                                    onClick={() => submitReview(product.id)}
                                  >
                                    {submittingReviewFor === product.id ? 'Saving review…' : 'Submit review'}
                                  </button>
                                </div>
                              ) : (
                                <p className="muted-copy">Log in to rate this product and leave a comment.</p>
                              )}

                              <div className="review-list">
                                {(reviewState?.reviews || []).length === 0 ? (
                                  <p className="muted-copy">No reviews yet. Be the first one.</p>
                                ) : (
                                  reviewState.reviews.map((review) => (
                                    <article key={review._id} className="review-item">
                                      <div className="review-item-head">
                                        <strong>{review.user?.username || 'Customer'}</strong>
                                        <span>{review.rating} ★</span>
                                      </div>
                                      <p>{review.comment || 'No written comment.'}</p>
                                    </article>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {!loading && products.length === 0 && searchQuery && (
        <section className="empty-state card-surface">
          <h3>No results for “{searchQuery}”</h3>
          <p>Try a broader radius or a more generic product term to surface nearby inventory.</p>
        </section>
      )}
    </div>
  )
}

export default SearchPage
