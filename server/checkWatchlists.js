const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/retailtech');
  const Watchlist = require('./models/Watchlist');
  const w = await Watchlist.find({}).lean();
  console.log(JSON.stringify(w, null, 2));
  process.exit(0);
}
check();
