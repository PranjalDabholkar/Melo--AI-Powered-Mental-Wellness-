const { logout } = require('../server/auth/me');

module.exports = async (req, res) => {
  if (req.method && req.method.toUpperCase() !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
    return;
  }
  return logout(req, res);
};

