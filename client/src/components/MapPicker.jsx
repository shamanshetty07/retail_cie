import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function LocationMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })

  if (!position?.lat || !position?.lng) return null

  return <Marker position={[position.lat, position.lng]} icon={markerIcon} draggable eventHandlers={{ dragend: (e) => {
    const marker = e.target
    const latlng = marker.getLatLng()
    onChange({ lat: latlng.lat, lng: latlng.lng })
  } }} />
}

function RecenterMap({ position }) {
  const map = useMapEvents({})
  if (position?.lat && position?.lng) {
    map.setView([position.lat, position.lng], map.getZoom())
  }
  return null
}

export default function MapPicker({ position, onChange }) {
  const center = position?.lat && position?.lng ? [position.lat, position.lng] : [20.5937, 78.9629]

  return (
    <div className="map-picker">
      <MapContainer center={center} zoom={position?.lat && position?.lng ? 15 : 5} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onChange={onChange} />
        <RecenterMap position={position} />
      </MapContainer>
      <p className="map-help">Click the map to place your store pin, or drag the marker to fine-tune it.</p>
    </div>
  )
}
