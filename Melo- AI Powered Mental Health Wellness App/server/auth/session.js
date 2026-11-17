const jwt = require('jsonwebtoken');

const SESSION_COOKIE = 'melo_session';

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error('Missing APP_SESSION_SECRET env var');
  }
  return secret;
}

function createSessionToken(payload, { expiresIn = '7d' } = {}) {
  return jwt.sign(payload, getSessionSecret(), { expiresIn });
}

function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getSessionSecret());
  } catch (e) {
    return null;
  }
}

module.exports = {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
};
