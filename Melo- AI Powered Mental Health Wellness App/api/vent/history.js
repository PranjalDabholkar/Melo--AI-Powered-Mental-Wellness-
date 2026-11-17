const database = require('../../server/database');
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
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    return sendJson(res, 405, { success: false, message: 'Method Not Allowed' });
  }

  try {
    const cutoffMs = Date.now() - MESSAGE_TTL_MS;
    try {
      await database.connect();
      const rows = await database.getVentHistory(50);
      const messages = rows.map((msg) => ({
        userId: msg.anonymousId || msg.userId,
        clientId: msg.clientId || '',
        text: msg.text,
        timestamp: msg.timestamp && msg.timestamp.toISOString
          ? msg.timestamp.toISOString()
          : new Date(msg.timestamp || Date.now()).toISOString()
      })).filter((msg) => new Date(msg.timestamp).getTime() >= cutoffMs);

      return sendJson(res, 200, { success: true, messages });
    } catch (dbError) {
      const store = getFallbackStore();
      const fresh = store.filter((msg) => new Date(msg.timestamp || Date.now()).getTime() >= cutoffMs).slice(-50);
      globalThis.__MELO_VENT_FALLBACK_MESSAGES = fresh;
      return sendJson(res, 200, { success: true, messages: fresh });
    }
  } catch (error) {
    return sendJson(res, 500, { success: false, message: 'Server error' });
  }
};
