const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Store = require('../models/Store');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get stores near location (geospatial search)
router.get('/nearby', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isFloat({ min: 0.1, max: 50 }).toFloat(),
  query('category').optional().isIn(['grocery', 'electronics', 'clothing', 'pharmacy', 'other']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng, radius = 10, category, limit = 20 } = req.query;
    const searchQuery = { isActive: true };
    if (category) searchQuery.category = category;

    const stores = await Store.find({
      ...searchQuery,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      }
    })
      .limit(limit)
      .select('name description location category rating operatingHours contact');

    res.json({ stores });
  } catch (error) {
    console.error('Nearby stores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store || !store.isActive) {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.json({ store });
  } catch (error) {
    console.error('Store details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/products', [
  query('category').optional(),
  query('search').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, search, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    const productQuery = { store: req.params.id, isActive: true };

    if (category) productQuery.category = category;
    if (search) productQuery.name = { $regex: search, $options: 'i' };

    const products = await Product.find(productQuery).sort({ price: 1 }).limit(limit).skip(skip);
    const total = await Product.countDocuments(productQuery);

    res.json({
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Store products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/products', auth, requireRole('store_owner'), [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Product name required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('description').optional().trim(),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid'),
  body('category').optional().isIn(['food', 'beverages', 'household', 'personal_care', 'electronics', 'clothing', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const store = await Store.findById(req.params.id);
    if (!store || store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const productPayload = { ...req.body, store: req.params.id };
    if (req.body.imageUrl) {
      productPayload.images = [{ url: req.body.imageUrl, alt: req.body.name }];
      delete productPayload.imageUrl;
    }

    const product = new Product(productPayload);
    await product.save();

    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:storeId/products/:productId', auth, requireRole('store_owner'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product || product.store.toString() !== req.params.storeId) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const store = await Store.findById(req.params.storeId);
    if (store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedFields = ['name', 'description', 'price', 'category', 'subcategory', 'brand', 'sku', 'barcode', 'images', 'specifications', 'tags'];
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    // Accept a plain imageUrl string and convert to images array
    if (req.body.imageUrl) {
      updates.images = [{ url: req.body.imageUrl, alt: product.name }];
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.productId, updates, {
      new: true,
      runValidators: true
    });

    if (typeof updates.price === 'number' && updates.price < product.price) {
      const Watchlist = require('../models/Watchlist');
      const watchlists = await Watchlist.find({
        'products.product': req.params.productId
      }).populate('user', 'username email');

      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');

      for (const watchlist of watchlists) {
        const item = watchlist.products.find(p => p.product.toString() === req.params.productId);
        if (!item) continue;

        if (item.targetPrice == null || updates.price <= item.targetPrice) {
          const alert = {
            productName: updatedProduct.name,
            newPrice: updates.price,
            storeName: store.name,
            createdAt: new Date()
          };

          // Use $push directly to avoid save() issues with older documents
          await Watchlist.findByIdAndUpdate(watchlist._id, {
            $push: { recentAlerts: alert }
          });

          const userId = watchlist.user._id.toString();
          if (userSockets.has(userId)) {
            io.to(userSockets.get(userId)).emit('priceDrop', {
              id: Date.now(),
              product: updatedProduct,
              productName: updatedProduct.name,
              newPrice: updates.price,
              watchlist: watchlist.name,
              storeName: store.name
            });
          }
        }
      }
    }

    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:storeId/products/:productId', auth, requireRole('store_owner'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product || product.store.toString() !== req.params.storeId) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const store = await Store.findById(req.params.storeId);
    if (store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Product.findByIdAndDelete(req.params.productId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, requireRole('store_owner'), [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Store name required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Location coordinates required'),
  body('location.coordinates.0').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('location.coordinates.1').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.address').optional(),
  body('category').optional().isIn(['grocery', 'electronics', 'clothing', 'pharmacy', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const store = new Store({ ...req.body, owner: req.user._id });
    await store.save();
    res.status(201).json({ message: 'Store created successfully', store });
  } catch (error) {
    console.error('Store creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, requireRole('store_owner'), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    if (store.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this store' });
    }

    const allowedFields = ['name', 'description', 'location', 'contact', 'category', 'operatingHours'];
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) updates[key] = req.body[key];
    });

    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.json({ message: 'Store updated successfully', store: updatedStore });
  } catch (error) {
    console.error('Store update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/owner/my-stores', auth, requireRole('store_owner'), async (req, res) => {
  try {
    const stores = await Store.find({ owner: req.user._id })
      .select('name description category location rating isActive createdAt');
    res.json({ stores });
  } catch (error) {
    console.error('My stores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
