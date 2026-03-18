import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'

const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const cheapestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function SearchResultsMap({ userLocation, stores, highlightedKey }) {
  const hasUserLocation = userLocation?.lat && userLocation?.lng
  const firstStore = stores?.[0]
  const center = hasUserLocation
    ? [userLocation.lat, userLocation.lng]
    : firstStore
      ? [firstStore.lat, firstStore.lng]
      : [20.5937, 78.9629]

  const zoom = hasUserLocation || firstStore ? 12 : 5

  return (
    <div className="search-map-wrapper">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="leaflet-map search-results-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasUserLocation && (
          <>
            <Circle center={[userLocation.lat, userLocation.lng]} radius={120} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.2 }} />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
              <Popup>You are here</Popup>
            </Marker>
          </>
        )}

        {stores.map((store, index) => {
          const isHighlighted = highlightedKey === store.key
          return (
            <Marker
              key={`${store.key}-${index}`}
              position={[store.lat, store.lng]}
              icon={store.isCheapest ? cheapestIcon : defaultIcon}
            >
              <Popup>
                <strong>{store.name}</strong>
                {store.isCheapest ? (
                  <>
                    <br />
                    Cheapest option
                  </>
                ) : null}
                <br />
                {store.productName}
                <br />
                Price: ₹{Number(store.price).toFixed(2)}
                {store.distance ? (
                  <>
                    <br />
                    {store.distance.toFixed(1)} km away
                  </>
                ) : null}
                {isHighlighted ? (
                  <>
                    <br />
                    Selected in results
                  </>
                ) : null}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
