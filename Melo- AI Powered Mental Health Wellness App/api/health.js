const database = require('../server/database');

module.exports = async (req, res) => {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
    return;
  }

  try {
    await database.connect();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ success: true, api: 'ok', db: 'ok' }));
  } catch (error) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ success: true, api: 'ok', db: 'down' }));
  }
};
