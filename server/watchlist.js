const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: "Watchlist route working" });
});

module.exports = router;