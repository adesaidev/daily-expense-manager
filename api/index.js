let app;
try {
  app = require('../server/dist/app').default;
} catch (err) {
  app = (_req, res) => {
    res.status(500).json({ loadError: err.message, stack: err.stack });
  };
}

module.exports = app;
