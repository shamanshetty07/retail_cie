const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { productId, storeId, price, distance, estimatedArrivalMins: clientEta } = req.body;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const estimatedArrivalMins = clientEta || (distance ? Math.ceil(distance * 4) + 5 : 15);

    const order = new Order({
      buyer: req.user.id,
      seller: store.owner,
      store: storeId,
      product: productId,
      price: price,
      distance: distance,
      estimatedArrivalMins: estimatedArrivalMins
    });

    await order.save();

    await order.populate('product', 'name');
    await order.populate('buyer', 'username');

    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const sellerSocketId = userSockets.get(store.owner.toString());

    if (sellerSocketId) {
      io.to(sellerSocketId).emit('orderPlaced', {
        _id: order._id,
        productId: order.product._id,
        productName: order.product.name,
        buyerName: order.buyer.username,
        price: order.price,
        storeId: order.store._id,
        estimatedArrivalMins: order.estimatedArrivalMins,
        createdAt: order.createdAt
      });
    }

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/seller
// @desc    Get orders for the logged-in seller
// @access  Private (Store owner)
router.get('/seller', auth, requireRole('store_owner'), async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('product', 'name')
      .populate('buyer', 'username')
      .populate('store', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ orders });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
