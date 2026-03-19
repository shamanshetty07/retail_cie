const mongoose = require('mongoose');
const User = require('./models/User');

async function testAlerts() {
  await mongoose.connect('mongodb://localhost:27017/retailtech');

  // find product
  const Product = require('./models/Product');
  const product = await Product.findOne({ name: 'pepsi' }) || await Product.findOne();
  
  if (!product) return console.log('no product found');

  // get store owner
  const Store = require('./models/Store');
  const store = await Store.findById(product.store);
  const seller = await User.findById(store.owner);

  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: seller._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
  
  const newPrice = product.price - 0.50; // decrement slightly
  console.log('reducing price from', product.price, 'to', newPrice);

  try {
    const res = await fetch(`http://localhost:5001/api/stores/${product.store}/products/${product._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ price: newPrice })
    });
    const data = await res.json();
    console.log('response:', data.message);
  } catch(e) {
    console.log('error', e.message);
  }
  
  // check db
  const Watchlist = require('./models/Watchlist');
  const w = await Watchlist.find({ 'products.product': product._id }).lean();
  console.log('watchlists after update:', JSON.stringify(w.map(i => ({ id: i._id, alerts: i.recentAlerts })), null, 2));
  
  process.exit();
}
testAlerts();
