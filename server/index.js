const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/retailtech')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/products', require('./routes/products'));
app.use('/api/watchlist', require('./routes/watchlists'));

const userSockets = new Map();

// WebSocket
io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      userSockets.set(decoded.userId, socket.id);
      socket.userId = decoded.userId;
      console.log(`User ${decoded.userId} authenticated`);
    } catch (err) {
      console.log('Authentication failed');
      socket.disconnect();
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Make io and userSockets available to routes
app.set('io', io);
app.set('userSockets', userSockets);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));