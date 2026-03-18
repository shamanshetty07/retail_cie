# RetailTech – Smart Local Store Price Comparison App

A MERN stack web application that helps shoppers find the best price for a product across nearby local stores, empowering small retailers over large e-commerce platforms.

## Tech Stack

- **Frontend:** React 19 with Vite, React Router, Axios, Socket.io Client
- **Backend:** Node.js + Express.js (RESTful APIs, JWT authentication)
- **Database:** MongoDB (with geospatial indexing for location-based queries)
- **Real-time:** WebSockets (Socket.io) for in-app price drop notifications

## Features

### Core Features

1. **Product Search & Price Comparison**
   - Search by product name
   - View nearby stores carrying the product with prices and distances
   - Results sorted by price (cheapest first)
   - Browser geolocation auto-detection with manual PIN/zip override
   - Configurable search radius

2. **Store Owner Dashboard**
   - Self-registration (no admin approval needed)
   - Store profile creation with geolocation
   - Manage product listings and prices
   - Independent store product catalogs

3. **Shopper Watchlist & Alerts (Logged-in only)**
   - Add products to watchlist with price threshold
   - Real-time WebSocket notifications when prices drop below threshold
   - Organized watchlist management

4. **Authentication**
   - Role-based access (Shopper vs Store Owner)
   - Guest browsing for search
   - JWT-based authentication
   - Secure password hashing with bcryptjs

## Project Structure

```
.
├── client/                          # React frontend
│   ├── src/
│   │   ├── App.jsx                 # Main app with routing
│   │   ├── App.css                 # Global styles
│   │   ├── pages/
│   │   │   ├── SearchPage.jsx      # Product search & comparison
│   │   │   ├── LoginPage.jsx       # User login
│   │   │   ├── RegisterPage.jsx    # User registration
│   │   │   ├── DashboardPage.jsx   # Store owner dashboard
│   │   │   └── WatchlistPage.jsx   # Watchlist & price alerts
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                          # Express backend
│   ├── config/                      # Configuration files
│   ├── controllers/                 # Route controllers
│   ├── middleware/                  # Auth middleware
│   ├── models/                      # MongoDB schemas
│   │   ├── User.js                 # User schema with roles
│   │   ├── Store.js                # Store schema with geolocation
│   │   ├── Product.js              # Product schema with price
│   │   ├── StoreProduct.js         # Store-product relationship
│   │   └── Watchlist.js            # Watchlist schema
│   ├── routes/                      # API routes
│   │   ├── auth.js                 # Authentication endpoints
│   │   ├── stores.js               # Store management endpoints
│   │   ├── products.js             # Product search endpoints
│   │   └── watchlists.js           # Watchlist endpoints
│   ├── utils/                       # Utility functions
│   │   └── distance.js             # Geolocation distance calculation
│   ├── index.js                    # Server entry point
│   ├── package.json
│   └── .env                        # Environment variables
├── .github/
│   └── copilot-instructions.md
└── package.json                    # Root package.json
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB running locally or MongoDB Atlas connection string
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/shamanshetty/Hackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run install-client
   npm run install-server
   ```

3. **Setup Environment Variables**

   Server (.env in server/ directory):
   ```
   MONGO_URI=mongodb://localhost:27017/retailtech
   JWT_SECRET=your-secret-key-change-in-production
   PORT=5000
   NODE_ENV=development
   ```

   Client (.env in client/ directory):
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Ensure MongoDB is running**
   ```bash
   # If using local MongoDB
   mongod
   ```

### Running the Application

**Development mode** (runs both client and server concurrently):
```bash
npm run dev
```

**Start server only:**
```bash
npm run dev --prefix server
```

**Start client only:**
```bash
npm run dev --prefix client
```

- Frontend will be available at `http://localhost:5173`
- Backend API will be available at `http://localhost:5000/api`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (shopper or store owner)
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products/search?q=<query>&lat=<lat>&lng=<lng>&radius=10` - Search products by name with nearby stores
- `GET /api/products/store/<storeId>` - Get products for a store

### Stores
- `GET /api/stores/nearby?lat=<lat>&lng=<lng>&radius=10` - Get nearby stores
- `POST /api/stores` - Create new store (store owner only)
- `GET /api/stores/owner` - Get stores for logged-in owner

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add product to watchlist
- `DELETE /api/watchlist/<id>` - Remove from watchlist

## Geospatial Features

The app uses MongoDB's geospatial indexing to efficiently query:
- Nearby stores from user's location
- Products available in nearby stores
- Distance calculations using Haversine formula

## WebSocket Events

Real-time notifications for price drops:
- **Connect:** User connects to WebSocket
- **price_drop:** Broadcast when a watched product's price drops below threshold
- **disconnect:** User disconnects

## Out of Scope for MVP

- Email/push notifications (in-app WebSocket only)
- Admin approval for store owners
- Shared global product catalog
- Mobile PWA / offline support
- Map view (list view with distance)
- Barcode scanning (desktop-friendly design)

## Development Notes

- Frontend uses React 19 with React Router for navigation
- Backend uses Express middleware for authentication
- MongoDB indexes on location field for geospatial queries
- JWT tokens stored in localStorage on client
- CORS enabled for frontend-backend communication

## Future Enhancements

- Email notifications for price drops
- Admin dashboard for managing store owners
- Barcode product database integration
- Mobile app (PWA)
- Map view with store locations
- Product reviews and ratings
- Inventory tracking for stores
- Bulk price updates

## License

ISC

## Support

For issues or questions, please open a GitHub issue or contact the development team.






