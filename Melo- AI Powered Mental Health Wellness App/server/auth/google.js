const crypto = require('crypto');
const https = require('https');
const database = require('../database');
const { getOriginFromReq, getUrl, parseCookies, setCookie, clearCookie, redirect, json } = require('./http');
const { SESSION_COOKIE, createSessionToken } = require('./session');

const OAUTH_STATE_COOKIE = 'melo_oauth_state';
const OAUTH_VERIFIER_COOKIE = 'melo_oauth_verifier';
const OAUTH_NEXT_COOKIE = 'melo_oauth_next';

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sha256Base64Url(str) {
  const hash = crypto.createHash('sha256').update(str).digest();
  return base64Url(hash);
}

function randomUrlSafe(bytes = 32) {
  return base64Url(crypto.randomBytes(bytes));
}

function httpsJson({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const status = res.statusCode || 0;
          try {
            const parsed = data ? JSON.parse(data) : null;
            if (status >= 200 && status < 300) resolve(parsed);
            else reject(Object.assign(new Error(`HTTP ${status}`), { status, body: parsed || data }));
          } catch (e) {
            reject(Object.assign(new Error('Invalid JSON response'), { status, body: data }));
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function requireGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
  }
  return { clientId, clientSecret };
}

function isSecureReq(req) {
  const xfProto = (req.headers['x-forwarded-proto'] || '').toString();
  if (xfProto) return xfProto.split(',')[0].trim() === 'https';
  return !!(req.connection && req.connection.encrypted);
}

async function start(req, res) {
  try {
    const { clientId } = requireGoogleEnv();
    const url = getUrl(req);
    const origin = getOriginFromReq(req);
    const secure = isSecureReq(req);

    const next = url.searchParams.get('next') || '/melo.html';
    const state = randomUrlSafe(16);
    const verifier = randomUrlSafe(32);
    const challenge = sha256Base64Url(verifier);

    const redirectUri = `${origin}/api/auth/google/callback`;

    setCookie(res, OAUTH_STATE_COOKIE, state, { httpOnly: true, secure, sameSite: 'Lax' });
    setCookie(res, OAUTH_VERIFIER_COOKIE, verifier, { httpOnly: true, secure, sameSite: 'Lax' });
    setCookie(res, OAUTH_NEXT_COOKIE, next, { httpOnly: true, secure, sameSite: 'Lax' });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'select_account');

    redirect(res, authUrl.toString(), 302);
  } catch (e) {
    console.error('[AUTH] google start failed', e);
    json(res, 500, { success: false, message: 'Auth start failed' });
  }
}

async function callback(req, res) {
  const secure = isSecureReq(req);
  try {
    const { clientId, clientSecret } = requireGoogleEnv();
    const url = getUrl(req);
    const origin = getOriginFromReq(req);
    const redirectUri = `${origin}/api/auth/google/callback`;

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req);

    const expectedState = cookies[OAUTH_STATE_COOKIE];
    const verifier = cookies[OAUTH_VERIFIER_COOKIE];
    const next = cookies[OAUTH_NEXT_COOKIE] || '/melo.html';

    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      clearCookie(res, OAUTH_STATE_COOKIE, { secure });
      clearCookie(res, OAUTH_VERIFIER_COOKIE, { secure });
      clearCookie(res, OAUTH_NEXT_COOKIE, { secure });
      redirect(res, '/login.html', 302);
      return;
    }

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString();

    const token = await httpsJson({
      method: 'POST',
      url: 'https://oauth2.googleapis.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenBody),
      },
      body: tokenBody,
    });

    const accessToken = token && token.access_token;
    if (!accessToken) {
      throw new Error('No access_token returned');
    }

    const userinfo = await httpsJson({
      method: 'GET',
      url: 'https://openidconnect.googleapis.com/v1/userinfo',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userId = userinfo && userinfo.sub;
    const email = (userinfo && userinfo.email) || '';
    const name = (userinfo && userinfo.name) || '';

    if (!userId) {
      throw new Error('No user sub returned');
    }

    await database.connect();
    await database.updateUser(userId, { userId, email, name });

    const sessionToken = createSessionToken({ userId, email, name });
    setCookie(res, SESSION_COOKIE, sessionToken, { httpOnly: true, secure, sameSite: 'Lax' });

    clearCookie(res, OAUTH_STATE_COOKIE, { secure });
    clearCookie(res, OAUTH_VERIFIER_COOKIE, { secure });
    clearCookie(res, OAUTH_NEXT_COOKIE, { secure });

    redirect(res, next, 302);
  } catch (e) {
    console.error('[AUTH] google callback failed', e);
    clearCookie(res, OAUTH_STATE_COOKIE, { secure });
    clearCookie(res, OAUTH_VERIFIER_COOKIE, { secure });
    clearCookie(res, OAUTH_NEXT_COOKIE, { secure });
    redirect(res, '/login.html', 302);
  }
}

module.exports = {
  start,
  callback,
};

