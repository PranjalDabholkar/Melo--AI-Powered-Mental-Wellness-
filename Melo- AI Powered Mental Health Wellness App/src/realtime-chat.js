const RT_APP_ROOT_ID = 'realtime-app';

const RT_WS_URL =
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'localhost:8080'
        : window.location.host);

let rtSocket = null;
let rtUsername = localStorage.getItem('melo_chat_username') || '';
let rtMessages = [];

function rtEscapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function rtRenderMessage(msg) {
    const mine = msg.username === rtUsername;
    return `
        <div class="flex ${mine ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] rounded-2xl border border-border/70 bg-black/60 px-3 py-2 text-sm shadow-sm ${
                mine ? 'bg-indigo-600/20 border-indigo-500/40' : ''
            }">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="text-xs font-semibold ${mine ? 'text-indigo-300' : 'text-gray-300'}">
                        ${rtEscapeHtml(msg.username || 'Anonymous')}
                    </span>
                    <span class="text-[10px] text-gray-500">
                        ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <p class="text-gray-200 whitespace-pre-wrap break-words">${rtEscapeHtml(msg.text)}</p>
            </div>
        </div>
    `;
}

function rtSetConnectionBadge(status, classes) {
    const badge = document.getElementById('rt-connection-badge');
    if (!badge) return;
    badge.textContent = status;
    badge.className =
        'inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium ' +
        classes;
}

function rtAutoScroll() {
    const container = document.getElementById('rt-chat-scroll');
    if (!container) return;
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function rtRender() {
    const root = document.getElementById(RT_APP_ROOT_ID);
    if (!root) return;

    root.innerHTML = `
        <main class="flex-1 flex flex-col items-center px-4 py-10 bg-gradient-to-b from-slate-950 via-slate-950 to-black">
            <div class="w-full max-w-6xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
                <section class="space-y-8">
                    <div class="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-gray-400 mb-2">
                        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                        Live Vent Room · Realtime
                    </div>

                    <div class="space-y-4">
                        <h1 class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
                            Talk it out,<br/>
                            <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400">
                                together in real‑time
                            </span>
                        </h1>
                        <p class="text-base md:text-lg text-gray-400 max-w-xl">
                            A clean, shadcn‑inspired interface for anonymous, real‑time conversation.
                            Join as yourself or stay low‑key – the room updates instantly as people type.
                        </p>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-3">
                        <div class="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
                            <p class="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1">Latency</p>
                            <p class="text-2xl font-semibold text-emerald-400" id="rt-latency-label">—</p>
                            <p class="text-xs text-gray-500">WebSocket heartbeat in ms</p>
                        </div>
                        <div class="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
                            <p class="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1">Online</p>
                            <p class="text-2xl font-semibold text-sky-400" id="rt-members-label">—</p>
                            <p class="text-xs text-gray-500">Active participants</p>
                        </div>
                        <div class="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
                            <p class="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1">Handle</p>
                            <p class="text-2xl font-semibold truncate" id="rt-username-label">
                                ${rtUsername ? rtEscapeHtml(rtUsername) : 'Set username ↓'}
                            </p>
                            <p class="text-xs text-gray-500">Visible to others</p>
                        </div>
                    </div>
                </section>

                <section class="rounded-3xl border border-border bg-card/90 shadow-xl flex flex-col h-[540px] overflow-hidden">
                    <header class="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-black/40">
                        <div class="flex items-center gap-2">
                            <div class="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-sky-400 flex items-center justify-center text-xs font-semibold text-white">
                                💬
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-white">Realtime Vent Room</p>
                                <p class="text-xs text-gray-500">Messages sync across all open clients</p>
                            </div>
                        </div>
                        <span id="rt-connection-badge" class="inline-flex items-center rounded-full border border-gray-700 px-2 py-1 text-[10px] font-medium text-gray-400">
                            • Connecting…
                        </span>
                    </header>

                    <div id="rt-chat-scroll" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-slate-950/40 to-black/60">
                        ${rtMessages.map(rtRenderMessage).join('')}
                    </div>

                    <footer class="border-t border-border/70 bg-black/60 p-3 space-y-2">
                        <form id="rt-username-form" class="flex gap-2">
                            <input
                                id="rt-username-input"
                                type="text"
                                placeholder="Choose a username..."
                                value="${rtEscapeHtml(rtUsername)}"
                                class="flex-1 rounded-xl border border-border bg-black/60 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70"
                            />
                            <button
                                type="submit"
                                class="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition">
                                Save
                            </button>
                        </form>

                        <form id="rt-message-form" class="flex gap-2">
                            <input
                                id="rt-message-input"
                                type="text"
                                placeholder="${rtUsername ? 'Send a supportive message…' : 'Set a username first'}"
                                ${rtUsername ? '' : 'disabled'}
                                class="flex-1 rounded-xl border border-border bg-black/60 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/70 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                ${rtUsername ? '' : 'disabled'}
                                class="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-40 disabled:hover:bg-accent">
                                Send
                            </button>
                        </form>
                    </footer>
                </section>
            </div>
        </main>
    `;

    rtAttachHandlers();
    rtAutoScroll();
}

function rtAttachHandlers() {
    const usernameForm = document.getElementById('rt-username-form');
    const usernameInput = document.getElementById('rt-username-input');
    const messageForm = document.getElementById('rt-message-form');
    const messageInput = document.getElementById('rt-message-input');

    if (usernameForm) {
        usernameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const value = usernameInput.value.trim();
            if (!value) return;
            rtUsername = value;
            localStorage.setItem('melo_chat_username', rtUsername);
            rtRender();
        });
    }

    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text || !rtSocket || rtSocket.readyState !== WebSocket.OPEN) return;

            const payload = {
                type: 'chat',
                text: text
            };

            try {
                rtSocket.send(JSON.stringify(payload));
                messageInput.value = '';
            } catch (err) {
                console.error('Error sending realtime message:', err);
            }
        });
    }
}

function rtInitSocket() {
    try {
        rtSocket = new WebSocket(RT_WS_URL);

        rtSocket.addEventListener('open', () => {
            rtSetConnectionBadge('• Connected', 'border-emerald-500/60 text-emerald-400 bg-emerald-500/10');
        });

        rtSocket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'init') {
                    const membersEl = document.getElementById('rt-members-label');
                    if (membersEl && typeof data.memberCount === 'number') {
                        membersEl.textContent = String(data.memberCount);
                    }
                    if (Array.isArray(data.history)) {
                        rtMessages = data.history.map((m) => ({
                            username: m.userId ? `Anon #${String(m.userId).slice(0, 4)}` : 'Anonymous',
                            text: m.text,
                            timestamp: m.timestamp
                        }));
                        rtRender();
                    }
                } else if (data.type === 'chat') {
                    rtMessages.push({
                        username: data.userId ? `Anon #${String(data.userId).slice(0, 4)}` : 'Anonymous',
                        text: data.text,
                        timestamp: data.timestamp
                    });
                    if (rtMessages.length > 100) rtMessages.shift();
                    rtRender();
                } else if (data.type === 'status') {
                    const membersEl = document.getElementById('rt-members-label');
                    if (membersEl && typeof data.memberCount === 'number') {
                        membersEl.textContent = String(data.memberCount);
                    }
                } else if (data.type === 'error') {
                    console.warn('Vent server error:', data.message);
                }
            } catch (e) {
                console.error('Error parsing realtime WS message:', e);
            }
        });

        rtSocket.addEventListener('close', () => {
            rtSetConnectionBadge('• Disconnected', 'border-gray-700 text-gray-400 bg-gray-900/60');
            setTimeout(rtInitSocket, 5000);
        });

        rtSocket.addEventListener('error', () => {
            rtSetConnectionBadge('• Error', 'border-red-500/60 text-red-400 bg-red-500/10');
        });
    } catch (err) {
        console.error('Realtime WebSocket init error:', err);
    }
}

// Initial render and socket connect
document.addEventListener('DOMContentLoaded', () => {
    rtRender();
    rtInitSocket();
});

