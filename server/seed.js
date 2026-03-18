const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/retailtech');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create store owner users
    const owner1 = await User.create({
      username: 'whole_foods',
      email: 'owner@wholefoods.com',
      password: 'password123',
      role: 'store_owner',
      profile: { firstName: 'John', lastName: 'Smith' }
    });

    const owner2 = await User.create({
      username: 'trader_joes',
      email: 'owner@traderjoes.com',
      password: 'password123',
      role: 'store_owner',
      profile: { firstName: 'Jane', lastName: 'Doe' }
    });

    const owner3 = await User.create({
      username: 'local_market',
      email: 'owner@localmarket.com',
      password: 'password123',
      role: 'store_owner',
      profile: { firstName: 'Bob', lastName: 'Johnson' }
    });

    console.log('Created store owners');

    // Create stores with geolocation (San Francisco Bay Area)
    const store1 = await Store.create({
      name: 'Whole Foods Market - Downtown',
      description: 'Premium organic grocery store',
      owner: owner1._id,
      location: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749], // San Francisco downtown
        address: {
          street: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102'
        }
      },
      contact: { phone: '(415) 555-0100', email: 'downtown@wholefoods.com' },
      category: 'grocery',
      operatingHours: { open: '8:00 AM', close: '10:00 PM' }
    });

    const store2 = await Store.create({
      name: 'Trader Joe\'s - Mission District',
      description: 'Casual neighborhood grocery store',
      owner: owner2._id,
      location: {
        type: 'Point',
        coordinates: [-122.4084, 37.7597], // Mission District
        address: {
          street: '456 Valencia St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94103'
        }
      },
      contact: { phone: '(415) 555-0200', email: 'mission@traderjoes.com' },
      category: 'grocery',
      operatingHours: { open: '9:00 AM', close: '9:00 PM' }
    });

    const store3 = await Store.create({
      name: 'Local Market - Castro',
      description: 'Community-focused local grocery',
      owner: owner3._id,
      location: {
        type: 'Point',
        coordinates: [-122.4356, 37.7599], // Castro District
        address: {
          street: '789 Castro St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94114'
        }
      },
      contact: { phone: '(415) 555-0300', email: 'castro@localmarket.com' },
      category: 'grocery',
      operatingHours: { open: '7:00 AM', close: '11:00 PM' }
    });

    console.log('Created stores');

    // Create products for each store
    const products = [
      // Store 1 products
      {
        store: store1._id,
        name: 'Organic Almond Milk',
        price: 4.99,
        category: 'beverages',
        brand: 'Whole Foods',
        description: '1L carton of organic almond milk'
      },
      {
        store: store1._id,
        name: 'Free-Range Eggs',
        price: 7.99,
        category: 'food',
        brand: 'Organic Valley',
        description: 'Dozen free-range eggs'
      },
      {
        store: store1._id,
        name: 'Organic Broccoli',
        price: 3.49,
        category: 'food',
        brand: 'Local Organic',
        description: 'Fresh organic broccoli per lb'
      },
      {
        store: store1._id,
        name: 'Greek Yogurt',
        price: 5.49,
        category: 'food',
        brand: 'Fage',
        description: '32oz Greek yogurt'
      },
      // Store 2 products
      {
        store: store2._id,
        name: 'Organic Almond Milk',
        price: 4.29,
        category: 'beverages',
        brand: 'Trader Joe\'s',
        description: '1L carton of organic almond milk'
      },
      {
        store: store2._id,
        name: 'Free-Range Eggs',
        price: 6.99,
        category: 'food',
        brand: 'Trader Joe\'s',
        description: 'Dozen free-range eggs'
      },
      {
        store: store2._id,
        name: 'Organic Broccoli',
        price: 2.99,
        category: 'food',
        brand: 'Trader Joe\'s',
        description: 'Fresh organic broccoli per lb'
      },
      {
        store: store2._id,
        name: 'Avocado Oil',
        price: 8.99,
        category: 'food',
        brand: 'Trader Joe\'s',
        description: '500ml bottle of avocado oil'
      },
      // Store 3 products
      {
        store: store3._id,
        name: 'Organic Almond Milk',
        price: 4.49,
        category: 'beverages',
        brand: 'Local Market Brand',
        description: '1L carton of organic almond milk'
      },
      {
        store: store3._id,
        name: 'Free-Range Eggs',
        price: 7.49,
        category: 'food',
        brand: 'Local Farm',
        description: 'Dozen free-range eggs'
      },
      {
        store: store3._id,
        name: 'Organic Broccoli',
        price: 3.29,
        category: 'food',
        brand: 'Local Farm',
        description: 'Fresh organic broccoli per lb'
      },
      {
        store: store3._id,
        name: 'Cheese Block',
        price: 6.99,
        category: 'food',
        brand: 'Local Dairy',
        description: '8oz block of cheddar cheese'
      },
      {
        store: store3._id,
        name: 'Whole Wheat Bread',
        price: 3.99,
        category: 'food',
        brand: 'Local Bakery',
        description: 'Fresh whole wheat bread loaf'
      }
    ];

    await Product.insertMany(products);
    console.log('Created products');

    console.log('✅ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('Store Owner 1: username=whole_foods, password=password123');
    console.log('Store Owner 2: username=trader_joes, password=password123');
    console.log('Store Owner 3: username=local_market, password=password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
