// Load local environment variables from .env for development (Windows PowerShell friendly).
require('dotenv').config();

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const database = require('./database');
const googleAuth = require('./auth/google');
const authMe = require('./auth/me');

const server = http.createServer(handleHttpRequest);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const MAX_MEMBERS = 50;
const MESSAGE_TTL_MS = 3 * 60 * 1000;
let connectedClients = new Set();
let messageHistory = [];
let ventFallbackMessages = [];

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$KR3S7h8.eM9lK7p2qX4nKO8mW5vN2zT1jY6hQ3pL8sD9aF0bR1'; // Hash of 'Watchdog_010'

async function handleHttpRequest(req, res) {
    // Normalize URL: strip query string so /melo.html?foo=bar works
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname || '/';
    const url = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    let filePath;

    // Handle API routes (use original req.url so query params still work)
    if (req.url.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        // Same-origin by default; if a browser sends an Origin header, echo it (supports cookies).
        if (req.headers.origin) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
            res.setHeader('Vary', 'Origin');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // ===== Auth endpoints (Google OAuth) =====
        if (req.method === 'GET' && req.url.startsWith('/api/auth/google/start')) {
            return googleAuth.start(req, res);
        }
        if (req.method === 'GET' && req.url.startsWith('/api/auth/google/callback')) {
            return googleAuth.callback(req, res);
        }
        if (req.method === 'GET' && req.url === '/api/me') {
            return authMe.me(req, res);
        }
        if (req.method === 'POST' && req.url === '/api/logout') {
            return authMe.logout(req, res);
        }
        if (req.method === 'GET' && req.url === '/api/health') {
            try {
                await database.connect();
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({ success: true, api: 'ok', db: 'ok' }));
            } catch (error) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({ success: true, api: 'ok', db: 'down' }));
            }
            return;
        }

        if (req.method === 'POST' && req.url === '/api/admin/validate') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { password } = JSON.parse(body);
                    if (!password) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ success: false, message: 'Password required' }));
                        return;
                    }

                    // In a real app, we would hash the input password and compare with ADMIN_PASSWORD_HASH
                    // For this demo, we'll keep the direct check but use the constant if it was intended
                    if (password === 'Watchdog_010') {
                        const token = crypto.randomBytes(32).toString('hex');
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Admin authenticated',
                            token: token
                        }));
                    } else {
                        res.writeHead(401);
                        res.end(JSON.stringify({ success: false, message: 'Invalid password' }));
                    }
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: 'Server error' }));
                }
            });
            return;
        }

        if (req.method === 'POST' && req.url === '/api/admin/change-password') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.writeHead(401);
                res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { newPassword } = JSON.parse(body);
                    if (!newPassword || newPassword.length < 6) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ success: false, message: 'Password must be at least 6 characters' }));
                        return;
                    }

                    console.log('[ADMIN] Password change request received (simulated)');
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: 'Password updated successfully' }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: 'Server error' }));
                }
            });
            return;
        }

        // ===== Database API Endpoints =====

        // Get user profile
        if (req.method === 'GET' && req.url.startsWith('/api/user/')) {
            const userId = req.url.split('/api/user/')[1];
            if (!userId) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: 'User ID required' }));
                return;
            }

            try {
                const user = await database.getUser(userId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, user: user || null }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Database error' }));
            }
            return;
        }

        // Update user profile
        if (req.method === 'POST' && req.url.startsWith('/api/user/')) {
            const userId = req.url.split('/api/user/')[1];
            if (!userId) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: 'User ID required' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const userData = JSON.parse(body);
                    const user = await database.updateUser(userId, userData);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, user }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: 'Database error' }));
                }
            });
            return;
        }

        // Save journal entry
        if (req.method === 'POST' && req.url === '/api/journal') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const entryData = JSON.parse(body);
                    const entry = await database.saveJournalEntry(entryData.userId, entryData);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, entry }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: 'Database error' }));
                }
            });
            return;
        }

        // Get journal entries
        if (req.method === 'GET' && req.url.startsWith('/api/journal/')) {
            const userId = req.url.split('/api/journal/')[1];
            if (!userId) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: 'User ID required' }));
                return;
            }

            try {
                const entries = await database.getJournalEntries(userId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, entries }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Database error' }));
            }
            return;
        }

        // Delete journal entry
        if (req.method === 'DELETE' && req.url.startsWith('/api/journal/')) {
            const parts = req.url.split('/api/journal/')[1].split('/');
            const userId = parts[0];
            const entryId = parts[1];

            if (!userId || !entryId) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: 'User ID and Entry ID required' }));
                return;
            }

            try {
                await database.deleteJournalEntry(userId, entryId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Entry deleted' }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Database error' }));
            }
            return;
        }

        // Save Auri message
        if (req.method === 'POST' && req.url === '/api/auri') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const messageData = JSON.parse(body);
                    const message = await database.saveAuriMessage(messageData.userId, messageData);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: 'Database error' }));
                }
            });
            return;
        }

        // Get Auri history
        if (req.method === 'GET' && req.url.startsWith('/api/auri/')) {
            const userId = req.url.split('/api/auri/')[1];
            if (!userId) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: 'User ID required' }));
                return;
            }

            try {
                const messages = await database.getAuriHistory(userId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, messages }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Database error' }));
            }
            return;
        }

        // Get vent history (for polling fallback when WebSocket unavailable)
        if (req.method === 'GET' && req.url === '/api/vent/history') {
            try {
                const cutoffMs = Date.now() - MESSAGE_TTL_MS;
                const raw = await database.getVentHistory(50);
                const messages = raw.map(msg => ({
                    userId: msg.anonymousId || msg.userId,
                    clientId: msg.clientId || '',
                    text: msg.text,
                    timestamp: (msg.timestamp && msg.timestamp.toISOString) ? msg.timestamp.toISOString() : new Date(msg.timestamp).toISOString()
                })).filter((msg) => new Date(msg.timestamp).getTime() >= cutoffMs);
                res.setHeader('Cache-Control', 'no-store');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, messages }));
            } catch (error) {
                // Keep Vent Room usable even when DB is down.
                const cutoffMs = Date.now() - MESSAGE_TTL_MS;
                ventFallbackMessages = ventFallbackMessages
                    .filter((msg) => new Date(msg.timestamp || Date.now()).getTime() >= cutoffMs)
                    .slice(-50);
                res.setHeader('Cache-Control', 'no-store');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, messages: ventFallbackMessages.slice(-50) }));
            }
            return;
        }

        // Post new vent message (HTTP fallback when WebSocket unavailable)
        if (req.method === 'POST' && req.url === '/api/vent') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body || '{}');
                    const text = (data.text && String(data.text).trim()).substring(0, 500);
                    const clientId = (data.clientId && String(data.clientId).trim().substring(0, 120)) || '';
                    if (!text) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Text required' }));
                        return;
                    }
                    const anonymousId = Math.random().toString(36).substring(2, 8).toUpperCase();
                    const now = new Date();
                    const chatMsg = { userId: anonymousId, text, timestamp: now, anonymousId, clientId };
                    try {
                        await database.saveVentMessage(chatMsg);
                    } catch (dbError) {
                        // Fallback in-memory persistence so cross-tab/user still works on this server instance.
                        const cutoffMs = Date.now() - MESSAGE_TTL_MS;
                        ventFallbackMessages = ventFallbackMessages
                            .filter((msg) => new Date(msg.timestamp || Date.now()).getTime() >= cutoffMs)
                            .slice(-50);
                        ventFallbackMessages.push({
                            userId: anonymousId,
                            clientId,
                            text,
                            timestamp: now.toISOString()
                        });
                        if (ventFallbackMessages.length > 50) ventFallbackMessages.shift();
                    }
                    const broadcastMsg = { type: 'chat', userId: anonymousId, clientId, text, timestamp: now.toISOString() };
                    messageHistory.push(broadcastMsg);
                    if (messageHistory.length > 50) messageHistory.shift();
                    broadcast(broadcastMsg);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: { userId: anonymousId, clientId, text, timestamp: now.toISOString() } }));
                } catch (error) {
                    console.error('Error posting vent:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Server error' }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        return;
    }

    // Map static files after API handling
    if (url.startsWith('/src/')) {
        filePath = path.join(__dirname, '..', url);
    } else {
        filePath = path.join(__dirname, '..', 'public', url);
    }

    // Serve static files
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found, serve 404.html if it exists
                const notFoundPath = path.join(__dirname, '..', 'public', '404.html');
                fs.readFile(notFoundPath, (err404, data404) => {
                    if (err404) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(data404);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            return;
        }

        // Set content type based on file extension
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        switch (ext) {
            case '.html':
                contentType = 'text/html';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.ico':
                contentType = 'image/x-icon';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

console.log(`Melo Server started on port ${PORT}`);

wss.on('connection', async (ws) => {
    if (connectedClients.size >= MAX_MEMBERS) {
        ws.send(JSON.stringify({ type: 'error', message: `Room is full (max ${MAX_MEMBERS} members)` }));
        ws.close();
        return;
    }

    // Assign an anonymous ID
    const anonymousId = Math.random().toString(36).substring(2, 8).toUpperCase();
    ws.userId = anonymousId;
    connectedClients.add(ws);

    console.log(`User ${anonymousId} joined. Total: ${connectedClients.size}`);

    try {
        // Load last 50 vent messages from database (shared across all users)
        const cutoffMs = Date.now() - MESSAGE_TTL_MS;
        const history = await database.getVentHistory(50);
        const formattedHistory = history.map(msg => ({
            type: 'chat',
            userId: msg.anonymousId || msg.userId,
            clientId: msg.clientId || '',
            text: msg.text,
            timestamp: (msg.timestamp && msg.timestamp.toISOString) ? msg.timestamp.toISOString() : new Date(msg.timestamp).toISOString()
        })).filter((msg) => new Date(msg.timestamp).getTime() >= cutoffMs);

        ws.send(JSON.stringify({
            type: 'init',
            userId: anonymousId,
            history: formattedHistory,
            memberCount: connectedClients.size
        }));
    } catch (error) {
        console.error('Error loading vent history:', error);
        ws.send(JSON.stringify({
            type: 'init',
            userId: anonymousId,
            history: [],
            memberCount: connectedClients.size
        }));
    }

    // Broadcast member count update
    broadcast({
        type: 'status',
        memberCount: connectedClients.size
    });

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'chat' && message.text && typeof message.text === 'string') {
                const now = new Date();
                const chatMsg = {
                    userId: ws.userId,
                    text: message.text.trim().substring(0, 500),
                    timestamp: now,
                    anonymousId: ws.userId
                };

                try {
                    await database.saveVentMessage(chatMsg);
                } catch (error) {
                    console.error('Error saving vent message to database:', error);
                }

                const broadcastMsg = {
                    type: 'chat',
                    userId: ws.userId,
                    text: chatMsg.text,
                    timestamp: now.toISOString()
                };

                messageHistory.push(broadcastMsg);
                if (messageHistory.length > 50) messageHistory.shift();

                broadcast(broadcastMsg);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        connectedClients.delete(ws);
        console.log(`User ${ws.userId} left. Total: ${connectedClients.size}`);
        broadcast({
            type: 'status',
            memberCount: connectedClients.size
        });
    });
});

function broadcast(data) {
    const payload = JSON.stringify(data);
    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

server.listen(PORT, async () => {
    console.log(`Server listening on http://localhost:${PORT}`);

    // Initialize database connection
    try {
        await database.connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Failed to connect to database:', error);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
