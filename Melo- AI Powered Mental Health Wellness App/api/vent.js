const database = require('../server/database');
const MESSAGE_TTL_MS = 3 * 60 * 1000;

function getFallbackStore() {
  if (!globalThis.__MELO_VENT_FALLBACK_MESSAGES) {
    globalThis.__MELO_VENT_FALLBACK_MESSAGES = [];
  }
  return globalThis.__MELO_VENT_FALLBACK_MESSAGES;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function parseRequestBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = async (req, res) => {
  if ((req.method || 'GET').toUpperCase() !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = await parseRequestBody(req);
    const text = String(body.text || '').trim().substring(0, 500);
    const clientId = String(body.clientId || '').trim().substring(0, 120);

    if (!text) {
      return sendJson(res, 400, { success: false, message: 'Text required' });
    }

    const anonymousId = `Anon-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    try {
      await database.connect();
      await database.saveVentMessage({
        userId: anonymousId,
        anonymousId,
        clientId,
        text,
        timestamp: new Date(nowIso)
      });
    } catch (dbError) {
      const store = getFallbackStore();
      const cutoffMs = Date.now() - MESSAGE_TTL_MS;
      const fresh = store.filter((msg) => new Date(msg.timestamp || Date.now()).getTime() >= cutoffMs);
      store.length = 0;
      store.push(...fresh);
      store.push({
        userId: anonymousId,
        clientId,
        text,
        timestamp: nowIso
      });
      while (store.length > 50) store.shift();
    }

    return sendJson(res, 200, {
      success: true,
      message: {
        userId: anonymousId,
        clientId,
        text,
        timestamp: nowIso
      }
    });
  } catch (error) {
    return sendJson(res, 500, { success: false, message: 'Server error' });
  }
};
