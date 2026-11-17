const { URL } = require('url');

function getOriginFromReq(req) {
  let proto =
    (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim() ||
    (req.connection && req.connection.encrypted ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();

  // On Render and other proxies, some Node environments still report http internally.
  // Force https for known production hosts so OAuth redirect_uri matches console config.
  if (host && host.endsWith('.onrender.com') && proto === 'http') {
    proto = 'https';
  }

  return `${proto}://${host}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);

  const existing = res.getHeader('Set-Cookie');
  if (!existing) res.setHeader('Set-Cookie', parts.join('; '));
  else if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, parts.join('; ')]);
  else res.setHeader('Set-Cookie', [existing, parts.join('; ')]);
}

function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

function redirect(res, location, status = 302) {
  res.statusCode = status;
  res.setHeader('Location', location);
  res.end();
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getUrl(req) {
  const origin = getOriginFromReq(req);
  return new URL(req.url, origin);
}

module.exports = {
  getOriginFromReq,
  parseCookies,
  setCookie,
  clearCookie,
  redirect,
  json,
  getUrl,
};
