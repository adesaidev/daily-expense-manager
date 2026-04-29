let app;
try {
  app = require('../server/dist/app').default;
} catch (err) {
  app = (_req, res) => {
    res.status(500).json({ loadError: err.message, stack: err.stack });
  };
}

// Temporarily expose DB_URL diagnostic (first 40 chars only)
const originalApp = app;
module.exports = (req, res) => {
  if (req.url === '/api/_diag') {
    const url = process.env.DATABASE_URL || '';
    return res.json({
      hasUrl: !!url,
      urlStart: url.substring(0, 40),
      containsNeon: url.includes('neon.tech'),
      nodeEnv: process.env.NODE_ENV,
    });
  }
  return originalApp(req, res);
};
