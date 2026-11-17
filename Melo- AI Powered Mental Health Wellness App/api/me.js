const { me } = require('../server/auth/me');

module.exports = async (req, res) => {
  return me(req, res);
};

