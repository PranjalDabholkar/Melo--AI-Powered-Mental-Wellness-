const googleAuth = require('../../../server/auth/google');

module.exports = async (req, res) => {
  return googleAuth.callback(req, res);
};

