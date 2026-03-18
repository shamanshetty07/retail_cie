const mongoose = require('mongoose');

const storeProductSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  unit: {
    type: String,
    enum: ['piece', 'lb', 'kg', 'oz', 'liter', 'gallon', 'pack', 'box'],
    default: 'piece'
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  priceHistory: [{
    price: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for store and product uniqueness
storeProductSchema.index({ store: 1, product: 1 }, { unique: true });

// Index for price queries
storeProductSchema.index({ price: 1 });

// Update updatedAt and lastUpdated on save
storeProductSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  this.lastUpdated = Date.now();
  
  // Add to price history if price changed
  if (this.isModified('price')) {
    this.priceHistory.push({
      price: this.price,
      date: new Date()
    });
  }
});

module.exports = mongoose.model('StoreProduct', storeProductSchema);