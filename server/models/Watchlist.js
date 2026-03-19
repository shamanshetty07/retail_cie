const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: String,
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    targetPrice: {
      type: Number,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  recentAlerts: [{
    productName: String,
    newPrice: Number,
    storeName: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user and name uniqueness
watchlistSchema.index({ user: 1, name: 1 }, { unique: true });

// Update updatedAt on save
watchlistSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Watchlist', watchlistSchema);