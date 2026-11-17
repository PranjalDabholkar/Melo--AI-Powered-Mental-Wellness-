const IS_STATIC_VENT_HOST = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');

// Same-origin WebSocket URL so Vent works on any port (e.g. localhost:8080)
function getVentWsUrl() {
    if (typeof window === 'undefined') return 'ws://localhost:8080';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return protocol + '//' + window.location.host;
}

const VentSocket = {
    socket: null,
    get url() { return getVentWsUrl(); },
    connected: false,
    onMessageCallback: null,
    onStatusCallback: null,
    myId: null,
    memberCount: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelayMs: 2000,
    _connecting: false,

    init(onMessage, onStatus) {
        this.onMessageCallback = onMessage;
        this.onStatusCallback = onStatus;

        if (IS_STATIC_VENT_HOST) {
            console.warn('⚠️ Vent room disabled on static host. Running in local-only mode.');
            this.connected = false;
            return;
        }

        this.connect();
    },

    connect() {
        if (this._connecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) return;
        this._connecting = true;

        try {
            const wsUrl = this.url;
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('✅ Connected to Vent Server');
                this.connected = true;
                this._connecting = false;
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'init') {
                        this.myId = data.userId;
                        this.memberCount = data.memberCount;
                        if (this.onMessageCallback) this.onMessageCallback(data.history || [], true);
                    } else if (data.type === 'chat') {
                        if (this.onMessageCallback) this.onMessageCallback([data], false);
                    } else if (data.type === 'status') {
                        this.memberCount = data.memberCount;
                        if (this.onStatusCallback) this.onStatusCallback(this.memberCount);
                    } else if (data.type === 'error') {
                        if (typeof showNotification === 'function') {
                            showNotification(data.message, 'error');
                        }
                    }
                } catch (parseError) {
                    console.error('Error parsing WebSocket message:', parseError);
                }
            };

            this.socket.onclose = () => {
                console.log('❌ Disconnected from Vent Server');
                this.connected = false;
                this._connecting = false;
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), this.reconnectDelayMs);
                } else {
                    console.warn('⚠️ Vent Server unavailable. Running in local-only mode.');
                }
            };

            this.socket.onerror = () => {
                this.connected = false;
            };
        } catch (e) {
            console.warn('⚠️ Socket connection failed. Vent room will not be available.', e);
            this.connected = false;
            this._connecting = false;
        }
    },

    sendMessage(text) {
        if (IS_STATIC_VENT_HOST) return false;
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
        try {
            this.socket.send(JSON.stringify({ type: 'chat', text: text }));
            return true;
        } catch (e) {
            console.error('Error sending message:', e);
            return false;
        }
    }
};

if (typeof window !== 'undefined') window.VentSocket = VentSocket;
