const database = require('../database');
const { parseCookies, json, clearCookie } = require('./http');
const { SESSION_COOKIE, verifySessionToken } = require('./session');

function isSecureReq(req) {
  const xfProto = (req.headers['x-forwarded-proto'] || '').toString();
  if (xfProto) return xfProto.split(',')[0].trim() === 'https';
  return !!(req.connection && req.connection.encrypted);
}

async function me(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const session = verifySessionToken(token);
  if (!session || !session.userId) {
    json(res, 401, { success: false, user: null });
    return;
  }

  try {
    await database.connect();
    const user = await database.getUser(session.userId);
    json(res, 200, {
      success: true,
      user: user
        ? { userId: user.userId, email: user.email || '', name: user.name || '' }
        : { userId: session.userId, email: session.email || '', name: session.name || '' },
    });
  } catch (e) {
    // If the database is temporarily unavailable, fall back to the session payload
    // so the user can still access the app instead of being bounced back to login.
    console.error('[AUTH] /me failed (falling back to session payload)', e);
    json(res, 200, {
      success: true,
      degraded: true,
      user: {
        userId: session.userId,
        email: session.email || '',
        name: session.name || '',
      },
    });
  }
}

async function logout(req, res) {
  const secure = isSecureReq(req);
  clearCookie(res, SESSION_COOKIE, { secure });
  json(res, 200, { success: true });
}

module.exports = { me, logout };

