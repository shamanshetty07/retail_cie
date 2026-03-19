const express = require('express');
const { body, validationResult } = require('express-validator');
const Watchlist = require('../models/Watchlist');
const StoreProduct = require('../models/StoreProduct');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user's watchlists
router.get('/', auth, async (req, res) => {
  try {
    const watchlists = await Watchlist.find({ 
      user: req.user._id,
      isActive: true 
    })
    .populate('products.product', 'name brand category images')
    .select('name description products notifications recentAlerts createdAt updatedAt');

    res.json({ watchlists });
  } catch (error) {
    console.error('Watchlists fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create watchlist
router.post('/', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Watchlist name required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('products').optional().isArray(),
  body('products.*.product').isMongoId().withMessage('Valid product ID required'),
  body('products.*.targetPrice').optional().isFloat({ min: 0 }).toFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, products = [] } = req.body;

    // Check if watchlist name already exists for user
    const existingWatchlist = await Watchlist.findOne({ 
      user: req.user._id, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingWatchlist) {
      return res.status(400).json({ message: 'Watchlist with this name already exists' });
    }

    const watchlist = new Watchlist({
      user: req.user._id,
      name,
      description,
      products
    });

    await watchlist.save();
    await watchlist.populate('products.product', 'name brand category images');

    res.status(201).json({
      message: 'Watchlist created successfully',
      watchlist
    });
  } catch (error) {
    console.error('Watchlist creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update watchlist
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const watchlist = await Watchlist.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    const allowedFields = ['name', 'description', 'notifications.email', 'notifications.push', 'products'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Array.isArray(req.body.products)) {
      updates.products = req.body.products.map(item => ({
        product: item.product,
        targetPrice: item.targetPrice ?? undefined,
        addedAt: item.addedAt || new Date()
      }));
    }

    const updatedWatchlist = await Watchlist.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('products.product', 'name brand category images');

    res.json({
      message: 'Watchlist updated successfully',
      watchlist: updatedWatchlist
    });
  } catch (error) {
    console.error('Watchlist update error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Watchlist name already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Add product to watchlist
router.post('/:id/products', auth, [
  body('product').isMongoId().withMessage('Valid product ID required'),
  body('targetPrice').optional().isFloat({ min: 0 }).toFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const watchlist = await Watchlist.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    const { product, targetPrice } = req.body;

    // Check if product already in watchlist
    const existingProduct = watchlist.products.find(p => 
      p.product.toString() === product
    );

    if (existingProduct) {
      return res.status(400).json({ message: 'Product already in watchlist' });
    }

    watchlist.products.push({
      product,
      targetPrice,
      addedAt: new Date()
    });

    await watchlist.save();
    await watchlist.populate('products.product', 'name brand category images');

    res.json({
      message: 'Product added to watchlist',
      watchlist
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove product from watchlist
router.delete('/:id/products/:productId', auth, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    watchlist.products = watchlist.products.filter(p => 
      p.product.toString() !== req.params.productId
    );

    await watchlist.save();

    res.json({ message: 'Product removed from watchlist' });
  } catch (error) {
    console.error('Remove product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete watchlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    res.json({ message: 'Watchlist deleted successfully' });
  } catch (error) {
    console.error('Watchlist deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get price alerts for watchlist
router.get('/:id/alerts', auth, async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('products.product', 'name brand category');

    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }

    const alerts = [];

    for (const item of watchlist.products) {
      if (item.targetPrice) {
        // Find current lowest price
        const lowestPrice = await StoreProduct.findOne({ 
          product: item.product._id,
          isActive: true,
          inStock: true 
        }).sort({ price: 1 });

        if (lowestPrice && lowestPrice.price <= item.targetPrice) {
          alerts.push({
            product: item.product,
            targetPrice: item.targetPrice,
            currentPrice: lowestPrice.price,
            discount: ((item.targetPrice - lowestPrice.price) / item.targetPrice * 100).toFixed(2),
            store: await require('../models/Store').findById(lowestPrice.store).select('name')
          });
        }
      }
    }

    res.json({ alerts });
  } catch (error) {
    console.error('Price alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;