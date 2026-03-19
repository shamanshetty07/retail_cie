const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/retailtech').then(async () => {
  const Watchlist = require('./models/Watchlist');
  const w = await Watchlist.find({});
  console.log(JSON.stringify(w, null, 2));
  process.exit();
});
