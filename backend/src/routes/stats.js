// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const router = express.Router();
// const DATA_PATH = path.join(__dirname, '../../data/items.json');
//
// // GET /api/stats
// router.get('/', (req, res, next) => {
//   fs.readFile(DATA_PATH, (err, raw) => {
//     if (err) return next(err);
//
//     const items = JSON.parse(raw);
//     // Intentional heavy CPU calculation
//     const stats = {
//       total: items.length,
//       averagePrice: items.reduce((acc, cur) => acc + cur.price, 0) / items.length
//     };
//
//     res.json(stats);
//   });
// });
//
// module.exports = router;

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

let cachedStats = null;

async function calculateStats() {
  try {
    const raw = await fs.promises.readFile(DATA_PATH);
    const items = JSON.parse(raw);
    const total = items.length;
    const averagePrice = total > 0 ? items.reduce((acc, cur) => acc + cur.price, 0) / total : 0;

    cachedStats = {
      total,
      averagePrice,
      timestamp: Date.now(),
    };
    console.log('Stats cache recalculated.');
  } catch (error) {
    console.error('Failed to calculate stats:', error);
    cachedStats = null; // Invalidate cache on error
  }
}

// Watch for changes in the data file, but not in test environment
if (process.env.NODE_ENV !== 'test') {
  fs.watch(DATA_PATH, (eventType, filename) => {
    if (filename) {
      console.log(`Data file changed: ${filename}. Invalidating cache.`);
      cachedStats = null;
    }
  });
}

// Initial calculation
calculateStats();

// GET /api/stats
router.get('/', async (req, res, next) => {
  if (cachedStats) {
    return res.json(cachedStats);
  }

  await calculateStats();

  if (cachedStats) {
    res.json(cachedStats);
  } else {
    // If stats are still null, it means there was an error
    next(new Error('Could not calculate stats.'));
  }
});

module.exports = router;
