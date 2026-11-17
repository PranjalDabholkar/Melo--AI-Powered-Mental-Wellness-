// src/vent-room.js
class VentRoom {
  constructor(containerId, options = {}) {
    this.root = document.getElementById(containerId);
    if (!this.root) throw new Error(`VentRoom: container #${containerId} not found`);

    this.maxMessages = options.maxMessages || 10;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000;
    this.cleanupEveryMs = 15 * 1000;
    this.storageKey = options.storageKey || 'ventRoomMessages:v1';

    this.replyPrompts = options.replyPrompts || [
      "I'm here for you. 💜",
      "That sounds really heavy. Thank you for sharing.",
      "You’re not alone in this. Want to say more?",
      "That’s a lot to carry. One thing at a time.",
      "It makes sense you feel this way.",
      "Breathing with you on this one. 🌙",
    ];

    this.messages = [];
    this._cleanupTimer = null;
  }

  init() {
    this._buildLayout();
    this._loadFromStorage();
    this._render();
    this._startCleanupLoop();
  }

  addMessage(text, fromUser = false) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    const now = Date.now();
    const msg = {
      id: now + Math.random(),
      text: trimmed,
      fromUser: !!fromUser,
      timestamp: now,
      expiresAt: now + this.ttlMs,
    };

    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this._saveToStorage();
    this._render();
  }

  _buildLayout() {
    this.root.classList.add('vr-root');
    this.root.innerHTML = `
      <div class="vr-card">
        <header class="vr-header">
          <div>
            <h2 class="vr-title">Vent Room ♡</h2>
            <p class="vr-subtitle">A safe space to share — messages fade for privacy.</p>
          </div>
          <button class="vr-new-btn" type="button">New Vent</button>
        </header>
        <div class="vr-feed" aria-live="polite"></div>
        <footer class="vr-footer">
          <div class="vr-counter" id="vr-counter">Messages: 0/${this.maxMessages}</div>
          <div class="vr-input-row">
            <textarea
              class="vr-input"
              id="vr-input"
              maxlength="200"
              rows="2"
              placeholder="I need to get something off my chest..."
            ></textarea>
            <button class="vr-send-btn" type="button">Send Vent</button>
          </div>
        </footer>
      </div>
    `;

    this.feedEl = this.root.querySelector('.vr-feed');
    this.inputEl = this.root.querySelector('#vr-input');
    this.sendBtn = this.root.querySelector('.vr-send-btn');
    this.counterEl = this.root.querySelector('#vr-counter');
    this.newBtn = this.root.querySelector('.vr-new-btn');

    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });
    this.newBtn.addEventListener('click', () => this._handleNewVent());
  }

  _handleSend() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.addMessage(text, true);
    this.inputEl.value = '';
    this._simulateFriendReplies();
  }

  _handleNewVent() {
    this.messages = [];
    this._saveToStorage();
    this._render();
    this.inputEl.focus();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;

      const now = Date.now();
      let valid = arr.filter((m) => m && m.expiresAt && m.expiresAt > now);
      valid.sort((a, b) => a.timestamp - b.timestamp);
      if (valid.length > this.maxMessages) valid = valid.slice(-this.maxMessages);
      this.messages = valid;
    } catch {
      this.messages = [];
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.messages));
    } catch {
      // ignore
    }
  }

  _startCleanupLoop() {
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
    this._cleanupTimer = setInterval(() => {
      const before = this.messages.length;
      const now = Date.now();
      this.messages = this.messages.filter((m) => m.expiresAt > now);
      if (this.messages.length !== before) {
        this._saveToStorage();
        this._render();
      }
    }, this.cleanupEveryMs);
  }

  _render() {
    this.feedEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    this.messages.forEach((msg) => {
      const bubble = document.createElement('div');
      bubble.className =
        'vr-message ' + (msg.fromUser ? 'vr-message--you' : 'vr-message--friend');
      const who = msg.fromUser ? 'You' : 'Friend';
      const ts = new Date(msg.timestamp);
      const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      bubble.innerHTML = `
        <div class="vr-message-meta">
          <span class="vr-avatar ${msg.fromUser ? 'vr-avatar--you' : 'vr-avatar--friend'}">
            ${msg.fromUser ? '🫵' : '♡'}
          </span>
          <span class="vr-sender">${who}</span>
          <span class="vr-time">${timeStr}</span>
        </div>
        <div class="vr-text">${this._escapeHtml(msg.text)}</div>
      `;
      bubble.classList.add('vr-message--enter');
      frag.appendChild(bubble);
    });

    this.feedEl.appendChild(frag);
    this.feedEl.scrollTop = this.feedEl.scrollHeight;
    this._updateCounter();
  }

  _updateCounter() {
    const count = this.messages.length;
    this.counterEl.textContent = `Messages: ${count}/${this.maxMessages}`;
    this.counterEl.classList.toggle('vr-counter--warn', count >= 8);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _simulateFriendReplies() {
    const repliesToSend = 1 + Math.floor(Math.random() * 3);
    const delays = [];
    for (let i = 0; i < repliesToSend; i++) {
      delays.push(2000 + Math.random() * 2000);
    }

    delays.reduce((acc, delay) => {
      const total = acc + delay;
      setTimeout(() => {
        const msg =
          this.replyPrompts[Math.floor(Math.random() * this.replyPrompts.length)];
        this.addMessage(msg, false);
      }, total);
      return total;
    }, 0);
  }
}

// Usage helper for standalone demos
window.VentRoom = VentRoom;

