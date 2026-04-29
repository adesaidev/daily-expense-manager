let app;
try {
  app = require('../server/dist/app').default;
} catch (err) {
  app = (_req, res) => {
    res.status(500).json({ loadError: err.message });
  };
}

const dbUrl = process.env.DATABASE_URL || '';

module.exports = (req, res) => {
  if (req.url && req.url.includes('_diag')) {
    return res.json({
      hasUrl: !!dbUrl,
      urlStart: dbUrl.substring(0, 50),
      containsNeon: dbUrl.includes('neon.tech'),
      nodeEnv: process.env.NODE_ENV,
    });
  }
  return app(req, res);
};
