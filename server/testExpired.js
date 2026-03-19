const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');

async function testExpiredToken() {
  await mongoose.connect('mongodb://localhost:27017/retailtech');
  const user = await User.findOne();

  // Create an expired token
  const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '-1s' });

  try {
    const res = await fetch('http://localhost:5001/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Status code:', res.status, 'Response:', data);
  } catch (err) {
    console.log('Error caught by fetch:', err.message);
  }

  process.exit();
}
testExpiredToken();
