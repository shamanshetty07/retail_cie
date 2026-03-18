const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['food', 'beverages', 'household', 'personal_care', 'electronics', 'clothing', 'other'],
    default: 'other'
  },
  subcategory: String,
  brand: String,
  sku: String,
  barcode: String,
  images: [{
    url: String,
    alt: String
  }],
  specifications: mongoose.Schema.Types.Mixed, // Flexible object for product specs
  tags: [String],
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

// Text index for search
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  brand: 'text', 
  tags: 'text' 
});

// Update updatedAt on save
productSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Product', productSchema);