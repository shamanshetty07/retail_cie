const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { getDistance } = require('../utils/distance');

const router = express.Router();

// Search products
router.get('/search', [
  query('q').trim().isLength({ min: 1 }).withMessage('Search query required'),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 10000 }).toFloat(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, lat, lng, radius = 10, limit = 20 } = req.query;

    let searchQuery = { name: { $regex: q, $options: 'i' }, isActive: true };

    let products = await Product.find(searchQuery)
      .populate('store', 'name location address')
      .limit(limit * 10);

    if (lat && lng) {
      products = products.filter((product) => {
        if (!product.store || !product.store.location || !product.store.location.coordinates) return false;
        const [storeLng, storeLat] = product.store.location.coordinates;
        const distance = getDistance(lat, lng, storeLat, storeLng);
        product.distance = distance;
        return distance <= radius;
      });
    }

    const grouped = {};
    products.forEach((product) => {
      const key = product.name.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          id: product._id,
          name: product.name,
          imageUrl: product.images?.[0]?.url || '',
          stores: []
        };
      }
      grouped[key].stores.push({
        store: product.store,
        price: product.price,
        distance: product.distance || null
      });
    });

    Object.values(grouped).forEach((item) => {
      item.stores.sort((a, b) => a.price - b.price);
    });

    const results = Object.values(grouped).slice(0, limit);

    res.json({ products: results });
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a product
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .populate('user', 'username')
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0;

    res.json({ reviews, averageRating, reviewCount });
  } catch (error) {
    console.error('Product reviews fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update a review for a product
router.post('/:id/reviews', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, product: req.params.id },
      {
        user: req.user._id,
        product: req.params.id,
        rating: Number(req.body.rating),
        comment: req.body.comment || ''
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).populate('user', 'username');

    res.status(201).json({ message: 'Review saved', review });
  } catch (error) {
    console.error('Product review save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product details with prices
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('store', 'name location address');

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Product details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
