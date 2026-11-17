// ===== Global State and Setup =====
const APP_CONTENT = document.getElementById('app-content');
let currentView = 'auri';
let viewHistory = [];
let isTyping = false;

// Access mode and user ID management
const ACCESS_MODE = localStorage.getItem('melo_access_mode') || 'guest';
const storedUserId = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);

// Generate or load user ID based on access mode
if (storedUserId) {
    window.uniqueUserId = storedUserId;
    console.log('✓ Loaded unique user ID:', storedUserId);
} else {
    if (ACCESS_MODE === 'guest') {
        // Guest mode: generate random ID
        window.uniqueUserId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, window.uniqueUserId);
        console.log('✓ Generated new guest user ID:', window.uniqueUserId);
    } else {
        // Account mode: should have been set during login
        window.uniqueUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, window.uniqueUserId);
        console.log('✓ Generated fallback user ID for account mode:', window.uniqueUserId);
    }
}

// Ensure APP_CONTENT exists before proceeding
if (!APP_CONTENT) {
    console.error('❌ APP_CONTENT element not found. App initialization will be delayed.');
}

// Mode-aware storage key generation
function getModeAwareKey(baseKey) {
    if (ACCESS_MODE === 'guest') {
        return baseKey; // Use original key for backward compatibility
    } else {
        // Account mode: prefix with user ID hash
        const userIdHash = btoa(window.uniqueUserId).slice(0, 8);
        return `${baseKey}_${userIdHash}`;
    }
}

function getApiBaseUrl() {
    return (window.CONFIG && window.CONFIG.API_ORIGIN) || window.location.origin;
}

function normalizeVentMessages(rawMessages) {
    const cutoffMs = Date.now() - VENT_MESSAGE_TTL_MS;
    return (rawMessages || [])
        .map((m) => ({
            userId: m.userId,
            clientId: m.clientId || '',
            text: m.text,
            timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp || Date.now())
        }))
        .filter((m) => m.timestamp.getTime() >= cutoffMs)
        .slice(-50);
}

function getVentSignature(messages) {
    return (messages || [])
        .map((m) => `${m.userId}|${m.clientId || ''}|${new Date(m.timestamp).getTime()}|${m.text}`)
        .join('||');
}

function isVentNearBottom() {
    const container = document.getElementById('vent-chat-container');
    if (!container) return true;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance < 120;
}

function setVentMessages(rawMessages, options = {}) {
    const { forceRender = false } = options;
    const normalized = normalizeVentMessages(rawMessages);
    const nextSig = getVentSignature(normalized);
    const changed = nextSig !== ventLastSignature;

    if (!changed && !forceRender) return;

    const shouldAutoScroll = isVentNearBottom();
    ventMessages = normalized;
    ventLastSignature = nextSig;

    if (currentView === 'vent') {
        renderVentView();
        if (shouldAutoScroll) {
            scrollToBottom('vent-chat-container');
        }
    }
}

console.log('📱 Melo v1.0 - Loading...');

// Real-time data storage
const WELCOME_MESSAGE = { 
    sender: 'Auri', 
    text: "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊",
    timestamp: new Date() 
};

let auriHistory = [];
let journalEntries = [];
let ventMessages = [];
const VENT_POLL_INTERVAL_MS = 1200; // smoother polling to reduce UI jitter
const VENT_MESSAGE_TTL_MS = 3 * 60 * 1000; // auto-expire vent messages after 3 minutes
let ventPollIntervalId = null;
let ventHealthIntervalId = null;
let ventHealthStatus = { api: 'unknown', db: 'unknown' };
let ventLastSignature = '';
let userProfile = {
    name: '',
    email: '',
    safetyContactName: '',
    safetyContactPhone: ''
};

// Data for new journal entry
let currentMood = '😀'; 
let currentJournalText = '';

// Use MOOD_SCORE_MAP from CONFIG
const { MOOD_SCORE_MAP } = CONFIG;

// ===== Smooth Animation Manager =====
const AnimationManager = {
    // Smooth page transition
    pageTransition: async function(viewName) {
        return new Promise((resolve) => {
            // Add exit animation to current content
            APP_CONTENT.classList.add('page-exit');
            
            setTimeout(() => {
                // Change view
                changeView(viewName);
                
                // Add enter animation
                APP_CONTENT.classList.remove('page-exit');
                APP_CONTENT.classList.add('page-transition');
                
                // Remove animation class after completion
                setTimeout(() => {
                    APP_CONTENT.classList.remove('page-transition');
                    resolve();
                }, 500);
            }, 150);
        });
    },
    
    // Stagger animation for multiple elements
    stagger: function(elements, animationClass, delay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add(animationClass);
            }, index * delay);
        });
    },
    
    // Typing animation
    typeText: async function(element, text, speed = 30) {
        return new Promise((resolve) => {
            let i = 0;
            element.textContent = '';
            
            const typeChar = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            };
            
            typeChar();
        });
    },
    
    // Pulse animation
    pulse: function(element, count = 2) {
        element.style.animation = 'pulseGlow 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, count * 500);
    }
};

// ===== Navigation System =====
let lastScrollTop = 0;
const NAV_THRESHOLD = 50;

function setupNavScroll() {
    const nav = document.getElementById('main-nav');
    const header = document.getElementById('app-header');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Standard Auto-hide logic for Nav and Header
        if (scrollTop > NAV_THRESHOLD) {
            if (scrollTop > lastScrollTop) {
                // Scroll Down - Hide Nav and Header
                nav.classList.add('nav-hidden');
                header?.classList.add('header-hidden');
            } else {
                // Scroll Up - Show Nav and Header
                nav.classList.remove('nav-hidden');
                header?.classList.remove('header-hidden');
            }
        } else {
            // Near top - show both
            nav.classList.remove('nav-hidden');
            header?.classList.remove('header-hidden');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
}

function changeView(viewName, saveToHistory = true) {
    if (viewName === 'home') {
        window.location.href = 'index.html';
        return;
    }
    if (viewName === 'about') {
        window.location.href = 'about.html';
        return;
    }

    if (saveToHistory && currentView !== viewName) {
        viewHistory.push(currentView);
    }
    
    // Cleanup any running processes from the current view
    cleanupCurrentView();
    
    currentView = viewName;
    
    // Update navigation buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active', 'text-purple-400');
        btn.classList.add('text-gray-400');
    });
    
    const activeNavBtn = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active', 'text-purple-400');
        activeNavBtn.classList.remove('text-gray-400');
    }
    
    // Show/Hide Back Button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        if (viewHistory.length > 0 && viewName !== 'login') {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }

    // Handle Navigation Bar visibility
    const nav = document.getElementById('main-nav');
    if (nav) {
        if (viewName === 'login') {
            nav.classList.add('nav-hidden');
        } else {
            // Only show nav if user is logged in
            const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGGED_IN) === 'true';
            if (isLoggedIn) {
                nav.classList.remove('nav-hidden');
            }
        }
    }

    // Render the view with smooth transition
    renderView();
    
    // Re-render Lucide icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 50);
}

function goBack() {
    if (viewHistory.length > 0) {
        const previousView = viewHistory.pop();
        changeView(previousView, false);
    }
}

function cleanupCurrentView() {
    // Stop breathing exercise if running
    if (typeof breathingExerciseInterval !== 'undefined' && breathingExerciseInterval) {
        clearInterval(breathingExerciseInterval);
        breathingExerciseInterval = null;
    }
    
    // Stop voice recognition/recording if running
    if (window.VoiceInputService && window.VoiceInputService.isListening) {
        window.VoiceInputService.stop();
    }
    if (window.VoiceRecorderService && window.VoiceRecorderService.isRecording) {
        window.VoiceRecorderService.stopRecording();
    }
    
    // Clear any pending timeouts that might disrupt UI
    isTyping = false;
}

async function changeViewWithAnimation(viewName) {
    await AnimationManager.pageTransition(viewName);
}

// ===== Vent Room: HTTP polling fallback (works when WebSocket fails) =====
function fetchVentHistory() {
    fetch(`${getApiBaseUrl()}/api/vent/history`)
        .then(r => r.json())
        .then(data => {
            if (!data.success || !Array.isArray(data.messages)) return;
            setVentMessages(data.messages);
        })
        .catch(() => {});
}

function startVentPolling() {
    if (ventPollIntervalId) return;
    fetchVentHistory();
    ventPollIntervalId = setInterval(fetchVentHistory, VENT_POLL_INTERVAL_MS);
}

function stopVentPolling() {
    if (ventPollIntervalId) {
        clearInterval(ventPollIntervalId);
        ventPollIntervalId = null;
    }
}

async function fetchVentHealth() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/api/health`, { cache: 'no-store' });
        const data = await response.json();
        ventHealthStatus = {
            api: data?.api === 'ok' ? 'ok' : 'down',
            db: data?.db === 'ok' ? 'ok' : 'down'
        };
    } catch (error) {
        ventHealthStatus = { api: 'down', db: 'down' };
    }

    if (currentView === 'vent') {
        const healthEl = document.getElementById('vent-health-status');
        if (healthEl) {
            const isHealthy = ventHealthStatus.api === 'ok' && ventHealthStatus.db === 'ok';
            healthEl.textContent = isHealthy ? 'API/DB OK' : `API ${ventHealthStatus.api.toUpperCase()} • DB ${ventHealthStatus.db.toUpperCase()}`;
            healthEl.className = `text-[10px] font-medium ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`;
        }
    }
}

function startVentHealthChecks() {
    if (ventHealthIntervalId) return;
    fetchVentHealth();
    ventHealthIntervalId = setInterval(fetchVentHealth, 5000);
}

// ===== MongoDB Data Initialization =====
async function initializeMongoDBData() {
    // Start Vent Room: WebSocket first, then HTTP polling fallback (500ms) so vent works even when WS fails
    startVentPolling();
    startVentHealthChecks();
    if (typeof VentSocket !== 'undefined') {
        VentSocket.init((messages, isInit) => {
            if (isInit) {
                setVentMessages(messages || [], { forceRender: true });
            } else {
                const incoming = (messages || []).map((m) => ({
                    userId: m.userId,
                    text: m.text,
                    timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
                }));
                setVentMessages([...ventMessages, ...incoming]);
            }
        }, (memberCount) => {
            if (currentView === 'vent') {
                const countBadge = document.getElementById('vent-member-count');
                if (countBadge) countBadge.textContent = `${memberCount}/50 online`;
                const statusEl = document.getElementById('vent-ws-status');
                if (statusEl && typeof VentSocket !== 'undefined' && VentSocket.connected) {
                    statusEl.textContent = '● Live';
                    statusEl.className = 'text-[10px] font-medium text-emerald-400';
                }
            }
        });
    }

    // Load user data from MongoDB
    try {
        console.log('📡 Loading data from MongoDB...');

        // Load Auri chat history
        const auriMessages = await window.DatabaseUtils.getAuriHistory(window.uniqueUserId);
        auriHistory = auriMessages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            text: msg.text,
            timestamp: new Date(msg.timestamp)
        }));
        auriHistory.sort((a, b) => a.timestamp - b.timestamp);

        // Ensure welcome message if empty
        if (auriHistory.length === 0) {
            auriHistory.push({ ...WELCOME_MESSAGE });
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.AURI_HISTORY, JSON.stringify(auriHistory));

        // Load journal entries
        const journalData = await window.DatabaseUtils.getJournalEntries(window.uniqueUserId);
        journalEntries = journalData.map(entry => ({
            id: entry._id,
            mood: entry.mood,
            text: entry.text,
            timestamp: new Date(entry.date)
        }));
        journalEntries.sort((a, b) => (b.timestamp.getTime() - a.timestamp.getTime()));
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));

        // Load user profile
        const userData = await window.DatabaseUtils.getUser(window.uniqueUserId);
        if (userData) {
            userProfile = { ...userProfile, ...userData };
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
        }

        console.log('✅ MongoDB data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading MongoDB data:', error);
        // Fallback to welcome message and empty data
        auriHistory = [{ ...WELCOME_MESSAGE }];
        journalEntries = [];
        ventMessages = [];
    }
}

// ===== Data Saving Functions =====
async function saveMessage(sender, text) {
    // Guard against accidental duplicate Auri replies
    if (sender === 'Auri' && auriHistory.length > 0) {
        const last = auriHistory[auriHistory.length - 1];
        if (last.sender === 'Auri' && last.text === text) {
            console.warn('Skipping duplicate Auri message with same text.');
            return;
        }
    }

    const message = { sender, text, timestamp: new Date() };

    // Update local state immediately so chat feels real-time
    auriHistory.push(message);
    localStorage.setItem(CONFIG.STORAGE_KEYS.AURI_HISTORY, JSON.stringify(auriHistory));
    if (currentView === 'auri') {
        renderAuriView();
        scrollToBottom('chat-container');
    }

    // Persist in background
    try {
        await window.DatabaseUtils.saveAuriMessage(window.uniqueUserId, message);
    } catch (error) {
        console.error("Error saving message:", error);
        // Local state already updated as a fallback
    }
}

async function saveVentMessage(text) {
    const ventWs = typeof VentSocket !== 'undefined' ? VentSocket : null;
    if (ventWs && ventWs.connected && ventWs.sendMessage(text)) {
        showNotification('Vent posted anonymously!', 'success');
        return;
    }

    // HTTP fallback: POST to server so all users see it (polling picks it up in ~500ms)
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/vent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text.trim().substring(0, 500),
                clientId: window.uniqueUserId || window.userId || ''
            })
        });
        const data = await res.json();
        if (data.success && data.message) {
            setVentMessages([...ventMessages, {
                userId: data.message.userId,
                clientId: data.message.clientId || (window.uniqueUserId || window.userId || ''),
                text: data.message.text,
                timestamp: new Date(data.message.timestamp)
            }]);
            showNotification('Vent posted anonymously!', 'success');
            return;
        }
    } catch (e) {
        console.warn('Vent POST failed:', e);
    }

    // Offline fallback
    setVentMessages([...ventMessages, {
        userId: window.uniqueUserId || 'local',
        clientId: window.uniqueUserId || window.userId || '',
        text: text,
        timestamp: new Date()
    }]);
    localStorage.setItem(CONFIG.STORAGE_KEYS.VENT_MESSAGES, JSON.stringify(ventMessages));
    showNotification('Saved locally. Connect to sync.', 'info');
}

async function saveProfileData(data) {
    try {
        const updatedUser = await window.DatabaseUtils.updateUser(window.uniqueUserId, data);
        userProfile = { ...userProfile, ...data };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error("Error saving profile data:", error);
        // Fallback to local storage
        userProfile = { ...userProfile, ...data };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
        showNotification('Profile saved locally!', 'info');
    }
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Basic Markdown renderer for chat messages (bold, italics, code, links, lists)
function renderMarkdown(text) {
    const escaped = escapeHtml(text || '');
    let html = escaped;

    // Code blocks ```code```
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre class="text-xs bg-gray-900/80 rounded-xl px-3 py-2 border border-gray-800 overflow-x-auto"><code>${code}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code class="text-xs bg-gray-900/80 rounded px-1 py-0.5 border border-gray-800">$1</code>');

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links [label](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 underline">$1</a>');

    // Simple bullet lists (- item or * item)
    html = html.replace(/^(?:-|\*)\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gis, '<ul class="list-disc list-inside space-y-1">$1</ul>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return html;
}

function scrollToBottom(id) {
    const element = document.getElementById(id);
    if (element) {
        setTimeout(() => {
            element.scrollTop = element.scrollHeight;
        }, 100);
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-purple-600'} text-white`;
    notification.textContent = message;
    notification.style.animation = 'slideDown 0.3s ease-out forwards';
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease-out reverse forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showModeBanner() {
    const banner = document.getElementById('mode-banner');
    const text = document.getElementById('banner-text');
    if (!banner || !text) {
        return;
    }
    const accessMode = localStorage.getItem('melo_access_mode') || 'guest';
    const email = localStorage.getItem('melo_user_email');
    
    banner.classList.remove('hidden');
    
    if (accessMode === 'guest') {
        banner.className = 'mode-banner bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 text-purple-200 px-4 py-2 text-center text-sm font-medium';
        text.textContent = 'Guest mode — your chats & journal are saved only on this device';
    } else if (accessMode === 'account') {
        banner.className = 'mode-banner bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 text-center text-sm font-medium';
        text.textContent = email ? `Logged in as ${email} • Your data is tied to this account` : 'Account mode — your data is tied to this account';
    }
}

// ===== 1. Auri Chat View =====
// Expanded Therapy FAQ Database
const THERAPY_FAQS = {
    // Greetings & Basic
    greetings: {
        patterns: ['hi', 'hello', 'hey', 'hey auri', 'hi auri', 'good morning', 'good evening', 'good afternoon'],
        response: "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊"
    },
    
    // About Melo
    about: {
        patterns: ['what is melo', 'about melo', 'tell me about melo', 'what does melo do', 'melo app', 'what is this app'],
        response: "Melo is an AI-powered mental wellness platform designed specifically for Gen Z. We provide tools for journaling, toolkit exercises, anonymous venting, and AI chat support to help manage anxiety, depression, and social isolation. 🧠✨"
    },
    
    // Creators
    creators: {
        patterns: ['who built melo', 'who made melo', 'who created melo', 'who developed melo', 'founder', 'makers of melo'],
        response: "Melo was built with love by **Samyak Pawar** — founder, designer and coder — who is passionate about making mental wellness accessible to everyone! ❤️"
    },
    
    // About Auri
    auri: {
        patterns: ['who are you', 'what are you', 'what is auri', 'tell me about yourself', 'who is auri'],
        response: "I'm Auri, your personal mental wellness assistant! I'm here to listen, support you, and help you find the right tools to feel better. Think of me as your friendly AI companion on your mental health journey. 🤝"
    },
    
    // Thanks
    thanks: {
        patterns: ['thank', 'thanks', 'thank you', 'appreciate', 'thx', 'ty'],
        response: "You're very welcome! I'm always here for you. Remember, you're doing great. 🌟"
    },
    
    // Mental Health Basics
    mentalIllness: {
        patterns: ['what is mental illness', 'meaning of mental illness', 'what is mental health', 'mental illness definition'],
        response: "Mental illnesses are health conditions that disrupt a person's thoughts, emotions, relationships, and daily functioning. They're medical conditions, not character flaws, and they are very much treatable. You're not alone in this. 💙"
    },
    
    warningSigns: {
        patterns: ['warning signs', 'symptoms of mental illness', 'signs i need help', 'when to get help'],
        response: "Common warning signs include: long-lasting sadness, extreme mood swings, excessive worrying, social withdrawal, significant changes in eating/sleeping habits, and loss of interest in things you used to enjoy. If you're noticing these, consider talking to a professional. 🩺"
    },
    
    recovery: {
        patterns: ['can i recover', 'recovery possible', 'can mental illness be cured', 'getting better', 'will i feel normal'],
        response: "Absolutely! With the right support—whether therapy, medication, or a strong support system—most people with mental health conditions can live full, productive, happy lives. Recovery is a journey, not a destination! ✨"
    },
    
    therapistVsPsychiatrist: {
        patterns: ['therapist vs psychiatrist', 'difference between therapist and psychiatrist', 'should i see a therapist', 'psychologist vs psychiatrist'],
        response: "Great question! **Psychiatrists** are medical doctors who can prescribe medication, while **therapists** (like psychologists or counselors) focus on talk therapy to help you process emotions and develop coping strategies. Often, the best approach involves both! 🤝"
    },
    
    getHelp: {
        patterns: ['how to get help', 'where to start', 'need help', 'want to get better', 'how do i start'],
        response: "You've already taken the first step by asking! Start by talking to someone you trust, or use our 'Aid' section to find professional resources. I'm also here to help you navigate your feelings every day. 🌈"
    },
    
    // Anxiety
    anxiety: {
        patterns: ['anxious', 'anxiety', 'anxiety attack', 'panic attack', 'feeling anxious', 'nervous', 'worrying', 'worried', 'overthinking'],
        response: "I'm sorry you're feeling anxious. Take a deep breath with me... In for 4, hold for 4, out for 4. 🧘‍♀️ You might also find our 'Breathing' exercise in the Toolkit helpful. Would you like to try it? Remember, anxious thoughts aren't facts—they're just thoughts passing through."
    },
    
    anxietyTips: {
        patterns: ['how to manage anxiety', 'anxiety tips', 'reduce anxiety', 'calm down', 'relaxation techniques'],
        response: "Here are some ways to manage anxiety: 1) Deep breathing (4-7-8 technique) 2) Grounding exercises (5-4-3-2-1) 3) Challenge worried thoughts 4) Limit caffeine 5) Exercise regularly 6) Talk to someone you trust. Our Toolkit has guided exercises for these! 🧘‍♀️"
    },
    
    // Depression
    depression: {
        patterns: ['depressed', 'depression', 'feeling depressed','unhappy', 'hopeless', 'empty', 'numb'],
        response: "I hear you, and it's okay to feel this way. You're not alone. I'm here to listen. Would you like to write about what's on your mind in your Journal, or maybe try a Grounding exercise? 💙 Remember: this feeling is temporary, even when it doesn't feel like it."
    },
    
    depressionVsSad: {
        patterns: [ 'difference between depression and sadness'],
        response: "Feeling sad is a normal emotion that comes and goes. Depression is more persistent—lasting 2+ weeks—and affects your daily life, sleep, appetite, and ability to enjoy things. If you're concerned, please speak with a mental health professional. You deserve support! 🩺"
    },
    
    // Loneliness
    loneliness: {
        patterns: ['lonely', 'loneliness', 'alone', 'isolated', 'no friends', 'feeling alone', 'no one understands'],
        response: "Feeling lonely is incredibly hard, and I want you to know your feelings are valid. Loneliness is different from being alone—it's feeling when surrounded by people disconnected even. Let's work through this together. Want to vent in our Vent Room, or try some tips to feel more connected? 🤝"
    },
    
    // Stress
    stress: {
        patterns: ['stressed', 'stress', 'overwhelmed', 'too much', 'cant cope', 'pressure'],
        response: "It sounds like you're carrying a lot right now. Stress can feel overwhelming, but there are ways to manage it. Try our 4-4-6 breathing exercise, break tasks into smaller steps, or take a break. Remember: you don't have to do everything at once. 🌿"
    },
    
    workStress: {
        patterns: ['work stress', 'job stress', 'burnout', 'workplace anxiety', 'boss stress', 'workload'],
        response: "Work stress is so common, and it can really affect your mental health. Some tips: set boundaries, take regular breaks, prioritize tasks, talk to your manager about workload, and make time for activities you enjoy. Our Toolkit has relaxation exercises too! 💼"
    },
    
    // Sleep
    sleep: {
        patterns: ['sleep', 'insomnia', 'cant sleep', 'can\'t sleep', 'sleep problems', 'tired but cant sleep', 'nightmares'],
        response: "Sleep and mental health are closely connected. Poor sleep can worsen anxiety and depression. Try: consistent sleep schedule, limiting screens before bed, keeping your room cool, and avoiding caffeine after 2pm. Our Toolkit has sleep relaxation exercises! 🌙"
    },
    
    // Self-Esteem
    selfEsteem: {
        patterns: ['self esteem', 'self worth', 'not good enough', 'feel worthless', 'hate myself', 'insecure', 'confidence'],
        response: "You are worthy exactly as you are, right now. Low self-esteem can be tough, but you can build it! Try: challenging negative self-talk, celebrating small wins, practicing self-compassion, and surrounding yourself with supportive people. You're stronger than you know! 💪"
    },
    
    // Relationships
    relationships: {
        patterns: ['relationship', 'friendship', 'family problems', 'dating', 'breakup', 'lonely in relationship', 'toxic relationship'],
        response: "Relationships can be complicated and have a big impact on our mental health. It's okay to set boundaries, take space, or end relationships that aren't healthy. What matters most is how you treat yourself. Want to talk about what's going on? 💙"
    },
    
    // Anger
    anger: {
        patterns: ['angry', 'anger', 'frustrated', 'mad', 'irritated', 'rage'],
        response: "Anger is a natural emotion, but it can be overwhelming. Try: taking deep breaths, counting to 10, physical exercise, expressing feelings through journaling, or talking to someone. It's okay to feel angry—what matters is how we respond. 🧘‍♂️"
    },
    
    // Grief
    grief: {
        patterns: ['grief', 'loss', 'died', 'passed away', 'mourning', 'lost someone', 'death'],
        response: "I'm so sorry for your loss. Grief is one of the hardest emotions to navigate, and there's no 'right' way to feel. Allow yourself to grieve, lean on support systems, and be patient with yourself. Our Journal can be a safe space to express your feelings. 💙"
    },
    
    // Trauma
    trauma: {
        patterns: ['trauma', 'ptsd', 'abuse', 'trauma response', 'triggered', 'flashbacks'],
        response: "Trauma is deeply personal and impactful. If you're experiencing trauma responses, please consider speaking with a trauma-informed therapist who can properly support you. In moments of distress, try grounding techniques: feel your feet on the ground, notice 5 things you can see. You're not alone. 🩹"
    },
    
    // Mindfulness
    mindfulness: {
        patterns: ['mindfulness', 'meditation', 'how to meditate', 'be present', 'mindful', 'centering'],
        response: "Mindfulness is about being present without judgment. Start small: focus on your breath for 2 minutes, notice sensations while walking, or try our guided breathing exercises. Our Toolkit has great resources for this! 🧘‍♀️"
    },
    
    // Self-Care
    selfCare: {
        patterns: ['self care', 'self-care', 'how to take care of myself', 'what is self care', 'treat myself'],
        response: "Self-care is anything that nourishes your mental, emotional, or physical well-being! This could be: taking a bath, reading a book, going for a walk, calling a friend, eating well, sleeping enough, or saying no to things that drain you. What feels nourishing to you today? 🌸"
    },
    
    // Coping
    coping: {
        patterns: ['coping', 'how to cope', 'deal with', 'coping mechanisms', 'coping skills', 'survive'],
        response: "Healthy coping strategies include: talking to someone, journaling, exercise, deep breathing, creative expression, spending time in nature, and seeking professional help when needed. What coping strategies have worked for you in the past? 🌟"
    },
    
    // Suicidal Thoughts
    suicidal: {
        patterns: ['suicidal', 'want to die', 'kill myself', 'end it all', 'better off dead', 'self harm', 'harm myself'],
        response: "I'm really concerned about you right now. If you're having thoughts of harming yourself, please reach out for immediate help: **iCall**: 9152987821, **Kiran Helpline**: 1800-599-0019. You matter, and these feelings can get better. Please talk to someone right now. 💙"
    },
    
    // Social Anxiety
    socialAnxiety: {
        patterns: ['social anxiety', 'shy', 'people pleaser', 'fear of judgment', 'can\'t talk to people', 'uncomfortable around others'],
        response: "Social anxiety is more common than you think! Start small: practice conversations with trusted friends, challenge negative thoughts, focus on others rather than yourself, and remember most people are too worried about themselves to judge you. You're doing great by reaching out! 🌟"
    },
    
    // Motivation
    motivation: {
        patterns: ['motivation', 'no motivation', 'lazy', 'can\'t get motivated', 'procrastination', 'procrastinate'],
        response: "Lack of motivation can be a sign of many things—stress, depression, or just burnout. Be gentle with yourself. Try breaking tasks into tiny steps, setting small goals, rewarding yourself, and remembering that starting is the hardest part. You've got this! 💪"
    },
    
    // Journaling
    journaling: {
        patterns: ['journal', 'journaling', 'should i journal', 'how to journal', 'journal prompts', 'journaling benefits'],
        response: "Journaling is a powerful tool for mental health! It helps process emotions, reduce stress, and gain clarity. Try writing about your day, what you're grateful for, or just let your thoughts flow. Our Journal feature makes it easy—want to try it? 📝"
    },
    
    // Breathing Exercises
    breathing: {
        patterns: ['breathing', 'breath', 'how to breathe', 'breathing exercise', 'calm down breathing'],
        response: "Let's try the 4-4-6 breathing technique: Inhale for 4 seconds, hold for 4, exhale for 6. This activates your parasympathetic nervous system and helps you feel calmer. Our Toolkit has a guided version if you'd like! 🧘‍♀️"
    },
    
    // Grounding
    grounding: {
        patterns: ['grounding', 'ground', 'present moment', 'stay present', 'dissociation', 'unreal feeling'],
        response: "Grounding techniques help bring you back to the present. Try the 5-4-3-2-1 method: Notice 5 things you SEE, 4 things you can TOUCH, 3 things you HEAR, 2 things you can SMELL, and 1 thing you can TASTE. Want me to guide you through it? 🦶"
    },
    
    // Perfectionism
    perfectionism: {
        patterns: ['perfectionist', 'perfectionism', 'not good enough', 'have to be perfect', 'imposter syndrome'],
        response: "Perfectionism can be a way to protect yourself from criticism, but it often holds us back. Try shifting from 'perfect' to 'good enough,' celebrate progress over perfection, and remember: mistakes are learning opportunities, not failures. You are enough as you are! 🌟"
    },
    
    // Panic
    panic: {
        patterns: ['panic', 'panic attack', 'heart racing', 'can\'t breathe', 'chest pain anxiety', 'going crazy'],
        response: "Panic attacks can feel terrifying, but they're not dangerous—even though it feels like it. Try: deep breathing (inhale 4, hold 4, exhale 6), splash cold water on your face, repeat 'this will pass' or 'I am safe.' Our Toolkit has more techniques. You're going to be okay. 💙"
    },
    
    // Identity
    identity: {
        patterns: ['identity', 'who am i', 'lost myself', 'purpose', 'meaning', 'figuring out who i am'],
        response: "Finding yourself is a journey, not a destination. It's okay to not have everything figured out. Try exploring new interests, reflecting on what brings you joy, talking to different people, and being patient with yourself. This uncertainty is part of growth! 🌱"
    },
    
    // Addiction
    addiction: {
        patterns: ['addiction', 'addicted', 'substance', 'alcohol', 'drugs', 'phone addiction', 'screen time'],
        response: "Addiction can feel like a trap, but recovery is possible. Consider reaching out to a professional for support. In the meantime, try identifying triggers, finding healthier coping mechanisms, and being kind to yourself during the process. You deserve help! 💙"
    },
    
    // Setting Boundaries
    boundaries: {
        patterns: ['boundaries', 'say no', 'people pleaser', 'setting boundaries', 'can\'t say no', 'too nice'],
        response: "Setting boundaries is crucial for mental health! Start small: practice saying 'no' to small requests, remember it's okay to prioritize your needs, and communicate clearly. People who respect you will understand. You don't have to say yes to everything! 🛡️"
    },
    
    // Physical Health & Mental Health
    physicalMental: {
        patterns: ['exercise', 'fitness', 'diet', 'nutrition', 'healthy body', 'does exercise help mental health'],
        response: "Physical and mental health are deeply connected! Exercise releases endorphins that boost mood, improves sleep, and reduces anxiety. Even short walks help! Aim for movement that feels good, not punishing. And don't forget proper nutrition and sleep! 💪"
    },
    
    // LGBTQ+ Support
    lgbtq: {
        patterns: ['lgbtq', 'gay', 'trans', 'queer', 'coming out', 'gender identity', ' sexuality'],
        response: "Your identity is valid, and you deserve support and acceptance. If you're struggling with coming out, identity, or discrimination, know that there are LGBTQ+-affirming therapists and support groups who can help. You are not alone in this journey. 🌈"
    },
    
    // Academic/Student Stress
    studentStress: {
        patterns: ['exam stress', 'academic', 'study', 'college stress', 'school stress', ' Grades', 'failed exam'],
        response: "Academic pressure is real! Remember: your worth isn't defined by grades. Try study breaks, proper sleep, healthy snacks, and talking to counselors if overwhelmed. One bad grade or exam doesn't define your future. You've got this! 📚"
    },
    
    // Financial Stress
    financialStress: {
        patterns: ['financial', 'money', 'broke', 'debt', 'can\'t afford', 'financial anxiety'],
        response: "Financial stress can really impact mental health. Try: making a realistic budget, focusing on what you can control, seeking financial counseling, and remembering that your worth isn't tied to money. Small steps matter. You're more than your bank account! 💰"
    },
    
    // Comparison/Social Media
    comparison: {
        patterns: ['compare', 'social media', 'instagram', 'tiktok', 'feeling inadequate', 'everyone else', 'fomo'],
        response: "Social media often shows highlight reels, not reality. It's easy to compare our behind-the-scenes to everyone else's highlights. Consider taking breaks, unfollowing accounts that make you feel bad, and remembering: you see their best, you feel your real. You are enough! 📱"
    },
    
    // Being There for Others
    helpingOthers: {
        patterns: ['help friend', 'support friend', 'someone i know is struggling', 'how to help someone', 'my friend is depressed'],
        response: "It's great that you want to help! Listen without judgment, encourage professional help, check in regularly, and take care of yourself too. You're not responsible for fixing them—just being there matters. Remember to set boundaries so you don't burn out! 🤝"
    },
    
    // Feeling Stuck
    stuck: {
        patterns: ['stuck', 'lost', 'don\'t know what to do', 'direction', 'feel stuck', 'no purpose'],
        response: "Feeling stuck is uncomfortable but common. Try: small actions to create momentum, reflecting on what used to bring joy, talking to mentors, or trying something completely new. Sometimes getting 'unstuck' just takes one small step. The fact that you're asking is already progress! 🌟"
    },
    
    // Time Management
    timeManagement: {
        patterns: ['time management', 'productive', 'lazy', 'wasting time', 'too much to do', 'organize'],
        response: "Try these tips: break big tasks into smaller ones, use time-blocking, take regular breaks, prioritize what matters, and remember rest is productive too. Our Toolkit has focus techniques if you'd like to try them! 🎯"
    },
    
    // Emotional Regulation
    emotionalRegulation: {
        patterns: ['emotional', 'mood swings', 'can\'t control emotions', 'feelings overwhelming', 'emotional dysregulation'],
        response: "Emotional regulation is a skill you can build! Try: naming your emotion ('I feel angry'), using deep breathing, physical movement, talking to someone, or the STOP technique (Stop, Take a breath, Observe, Proceed). It gets easier with practice! 💙"
    }
};

async function generateAuriResponse(prompt) {
    if (isTyping) return;

    // Clean prompt for matching (lowercase and remove punctuation)
    const cleanPrompt = prompt.toLowerCase().replace(/[^\w\s]/g, "").trim();

    // Check predefined therapy FAQs first
    for (const [key, faq] of Object.entries(THERAPY_FAQS)) {
        for (const pattern of faq.patterns) {
            if (cleanPrompt.includes(pattern)) {
                await saveMessage('Auri', faq.response);
                return;
            }
        }
    }

    // For all other questions, use the AI API
    isTyping = true;
    renderAuriView(); // Show typing indicator

    try {
        console.log('Calling API with prompt:', prompt);
        const responseText = await api.generateAuriResponse(prompt);
        console.log('API response received:', responseText);
        await saveMessage('Auri', responseText);
    } catch (error) {
        console.error("Auri response error:", error);
        await saveMessage('Auri', "Ugh, a connection error! 😭 Let's try again in a bit. In the meantime, maybe journal that thought? 📝");
    } finally {
        isTyping = false;
        renderAuriView();
        scrollToBottom('chat-container');
    }
}

async function handleAuriSubmit(event) {
    event.preventDefault();
    console.log('handleAuriSubmit called');
    
    const input = document.getElementById('auri-input');
    if (!input) return;
    const prompt = input.value.trim();
    
    console.log('Prompt:', prompt);
    console.log('isTyping:', isTyping);
    
    if (prompt && !isTyping) {
        // Add animation to input
        AnimationManager.pulse(input);
        
        console.log('Saving user message...');
        const messageText = prompt; // Store prompt before clearing input
        input.value = '';
        
        // Clear input with animation
        input.style.transform = 'scale(0.95)';
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 150);
        
        await saveMessage('User', messageText);
        
        console.log('Calling generateAuriResponse...');

        if (typeof generateAuriResponse !== 'function') {
            console.error('generateAuriResponse is not a function:', generateAuriResponse);
            showNotification('Auri is not ready yet. Please refresh the page.', 'error');
            return;
        }

        try {
            await generateAuriResponse(messageText);
        } catch (err) {
            console.error('Error while calling generateAuriResponse:', err);
            showNotification('Something went wrong while talking to Auri.', 'error');
        }
    } else {
        console.log('Either no prompt or isTyping is true');
    }
}

function renderAuriView() {
    let chatBubbles = '';
    
    if (auriHistory.length > 0) {
        chatBubbles = auriHistory.map((msg, index) => {
            const time = msg.timestamp?.seconds ? 
                new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            
            const markdownHtml = renderMarkdown(msg.text || '');
            
            const isUser = msg.sender === 'User';
            const bubbleClass = isUser
                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border border-white/10'
                : 'bg-[#0b1220]/80 text-gray-100 border border-gray-800/70';
            const alignClass = isUser ? 'justify-end' : 'justify-start';
            const metaClass = isUser ? 'text-white/70' : 'text-gray-400';

            return `
                <div class="flex ${alignClass} chat-message" style="animation-delay: ${index * 40}ms">
                    <div class="max-w-[78%]">
                        <div class="rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${bubbleClass}">
                            <div class="text-[11px] font-semibold mb-1 ${metaClass}">
                                ${isUser ? 'You' : 'Auri'}
                            </div>
                            <div class="text-sm leading-relaxed break-words">${markdownHtml}</div>
                            ${time ? `<div class="mt-2 text-[10px] ${metaClass}">${time}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        chatBubbles = `
            <div class="p-8 text-center text-gray-500 animate-fadeIn">
                <i data-lucide="sparkles" class="w-12 h-12 mx-auto mb-4 text-purple-600 animate-pulse"></i>
                <h3 class="text-white font-bold mb-2">Welcome to Auri!</h3>
                <p class="text-sm">I'm your personal mental wellness assistant. Say hi to get started, or ask me "What is Melo?" to learn more. 👋</p>
            </div>
        `;
    }

    const typingIndicator = isTyping ? `
        <div class="flex justify-start" id="typing-indicator">
            <div class="max-w-[78%] rounded-2xl px-4 py-3 bg-[#0b1220]/80 border border-gray-800/70 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div class="text-[11px] font-semibold mb-2 text-gray-400">Auri</div>
                <div class="flex items-center gap-1">
                    <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
                    <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
                    <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
                </div>
            </div>
        </div>
    ` : '';

    APP_CONTENT.innerHTML = `
        <div class="flex flex-col animate-fadeIn space-y-6 max-w-2xl mx-auto pb-6">
            <div class="flex items-center justify-between px-2">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-sky-400 shadow-[0_10px_30px_rgba(139,92,246,0.25)]"></div>
                    <div>
                        <div class="text-base font-extrabold text-white leading-tight">Auri</div>
                        <div class="text-xs text-gray-400">Your mental wellness companion</div>
                    </div>
                </div>
                <div class="inline-flex items-center gap-2 rounded-full border border-gray-800/70 bg-black/30 px-3 py-1 text-[11px] text-gray-300">
                    <span class="h-1.5 w-1.5 rounded-full ${isTyping ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}"></span>
                    <span>${isTyping ? 'Thinking…' : 'Online'}</span>
                </div>
            </div>

            <div id="chat-container" class="mt-4 space-y-3">
                ${chatBubbles}
                ${typingIndicator}
                <div class="h-2"></div>
            </div>

            <form onsubmit="handleAuriSubmit(event)" class="pt-2">
                <div class="flex items-end gap-3 rounded-3xl border border-gray-800/70 bg-gradient-to-r from-slate-950/80 to-slate-900/80 backdrop-blur-2xl px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                    <input
                        id="auri-input"
                        type="text"
                        placeholder="Message Auri…"
                        class="flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none text-sm px-2 py-2"
                        ${isTyping ? 'disabled' : ''}
                    />
                    <button
                        type="submit"
                        class="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)] hover:brightness-110 transition active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center"
                        ${isTyping ? 'disabled' : ''}
                        aria-label="Send message"
                    >
                        <i data-lucide="send" class="w-5 h-5"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Animate chat messages
    setTimeout(() => {
        const messages = document.querySelectorAll('.chat-message');
        AnimationManager.stagger(messages, 'animate-fadeIn', 80);
    }, 100);
    
    scrollToBottom('chat-container');
    lucide.createIcons();

    // Add focus/blur listeners to input for seamless nav transition
    const auriInput = document.getElementById('auri-input');
    const nav = document.getElementById('main-nav');
    if (auriInput && nav) {
        auriInput.addEventListener('focus', () => {
            // Keep nav visible or handle it more gracefully
            // nav.classList.add('nav-hidden'); // Removed this to keep nav visible
        });
        auriInput.addEventListener('blur', () => {
            // Only show if not scrolled down far
            if (APP_CONTENT.scrollTop < lastScrollTop || APP_CONTENT.scrollTop < NAV_THRESHOLD) {
                nav.classList.remove('nav-hidden');
            }
        });
    }
}

// ===== 2. Journal View =====
function setMood(mood) {
    // Remove selected and highlight classes from all mood buttons
    document.querySelectorAll('.mood-emoji').forEach(btn => {
        btn.classList.remove('selected');
        btn.classList.remove('sticker-tap-highlight');
    });
    
    // Add selected and highlight class to clicked mood
    const selectedBtn = document.querySelector(`.mood-emoji[onclick*="${mood}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
        selectedBtn.classList.add('sticker-tap-highlight');
        
        // Use Pulse animation from manager for extra feedback
        if (window.AnimationManager && AnimationManager.pulse) {
            AnimationManager.pulse(selectedBtn);
        }
    }
    
    currentMood = mood;
}

function updateJournalText(event) {
    currentJournalText = event.target.value;
}

async function saveJournalEntry() {
    const text = document.getElementById('journal-text-input').value.trim();
    if (!text) {
        showNotification('Please write something in your journal', 'error');
        return;
    }

    if (!currentMood) {
        showNotification('Please select a mood', 'error');
        return;
    }

    try {
        // Calculate mood score from CONFIG
        const moodScore = CONFIG.MOOD_SCORE_MAP[currentMood] || 3;

        const entryData = {
            mood: currentMood,
            moodScore: moodScore,
            text: text,
            date: new Date()
        };

        await window.DatabaseUtils.saveJournalEntry(window.uniqueUserId, entryData);

        showNotification('Journal entry saved! ✨', 'success');

        // Reset form
        currentJournalText = '';
        currentMood = '😀';
        const textarea = document.getElementById('journal-text-input');
        if (textarea) textarea.value = '';
        renderJournalView();
    } catch (error) {
        console.error("Error saving journal entry:", error);
        showNotification('Failed to save entry. Trying locally...', 'error');

        // Fallback to session storage
        const entry = {
            mood: currentMood,
            text: text,
            timestamp: new Date(),
            id: Date.now().toString()
        };

        journalEntries.unshift(entry);
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));

        showNotification('Saved locally instead!', 'info');

        // Reset form
        currentJournalText = '';
        currentMood = '😀';
        const textarea = document.getElementById('journal-text-input');
        if (textarea) textarea.value = '';
        renderJournalView();
    }
}

async function deleteJournalEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
        await window.DatabaseUtils.deleteJournalEntry(window.uniqueUserId, entryId);
        showNotification('Entry deleted', 'success');
        // Remove from local array
        journalEntries = journalEntries.filter(e => e.id !== entryId && e.id !== entryId.toString());
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));
        renderJournalView();
    } catch (error) {
        console.error('Error deleting entry:', error);
        showNotification('Error deleting entry', 'error');
        // Fallback to local delete
        journalEntries = journalEntries.filter(e => e.id !== entryId && e.id !== entryId.toString());
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(journalEntries));
        showNotification('Entry deleted locally', 'success');
        renderJournalView();
    }
}

function exportJournal() {
    if (typeof ExportService !== 'undefined') {
        ExportService.exportJournalAsJSON(journalEntries);
    } else {
        showNotification('Export service unavailable', 'error');
    }
}

async function exportJournalEntry(entryId) {
    const entry = journalEntries.find(e => e.id === entryId || e.id === entryId.toString());
    if (!entry) {
        showNotification('Entry not found', 'error');
        return;
    }

    try {
        // Create JSON file
        const data = {
            ...entry,
            exportDate: new Date().toISOString(),
            app: 'Melo Journal',
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `melo-journal-${new Date(entry.timestamp).toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        showNotification('Journal entry exported! 📥', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export entry', 'error');
    }
}

function renderJournalView() {
    const moodEmojis = ['😀', '😔', '😶', '🤯', '😴'];
    const moodButtons = moodEmojis.map(mood => `
        <button 
            class="mood-emoji text-3xl p-3 rounded-lg transition-all duration-300 ${currentMood === mood ? 'selected' : 'bg-gray-800 hover:bg-gray-700'}"
            onclick="setMood('${mood}')"
        >
            ${mood}
        </button>
    `).join('');
    
    const journalList = journalEntries.length > 0 ? journalEntries.map(entry => {
        const date = entry.timestamp ? 
            (entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp.seconds * 1000)) : 
            new Date();
        
        const dateStr = date.toLocaleDateString('en-IN', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="journal-entry bg-gray-800 p-4 rounded-xl shadow-lg mb-3 border border-gray-700 hover:border-purple-500 transition-all duration-300 card-hover animate-fadeInUp">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-3xl">${entry.mood}</span>
                    <div class="text-right">
                        <span class="text-xs text-gray-400 block">${dateStr}</span>
                        <span class="text-xs text-gray-500">${timeStr}</span>
                    </div>
                </div>
                <p class="text-sm text-gray-300 mb-3 whitespace-pre-wrap">${entry.text}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">Saved</span>
                    <button onclick="exportJournalEntry('${entry.id}')" class="text-xs flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full transition-all duration-300">
                        <i data-lucide="download" class="w-3 h-3"></i>
                        <span>Export</span>
                    </button>
                </div>
            </div>
        `;
    }).join('') : `
        <div class="p-8 text-center text-gray-500 animate-fadeIn">
            <i data-lucide="book-open-text" class="w-12 h-12 mx-auto mb-4 text-purple-600"></i>
            <p class="mb-2">No journal entries yet!</p>
            <p class="text-sm text-gray-400">Your first entry will appear here 📝</p>
        </div>
    `;

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn space-y-6">
            <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                <i data-lucide="book-open-text" class="w-8 h-8 text-purple-400"></i>
                <span>Smart Daily Journal</span>
            </h2>
            
            <!-- New Entry Card -->
            <div class="journal-notepad rounded-3xl shadow-[0_18px_40px_rgba(0,0,0,0.75)] mb-8 card-hover bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-900/90 border border-gray-800/70 px-5 py-6">
                <h3 class="text-xl font-semibold mb-4 text-purple-300">New Check-In</h3>
                
                <div class="flex flex-wrap gap-3 mb-6">
                    ${moodButtons}
                </div>
                
                <textarea 
                    id="journal-text-input"
                    rows="6" 
                    placeholder="How are you really feeling? Log your thoughts here..." 
                    class="w-full p-0 text-gray-200 bg-transparent rounded-lg focus:outline-none placeholder-gray-500 resize-none animated-textarea"
                    oninput="updateJournalText(event)"
                    onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); saveJournalEntry(); }"
                >${currentJournalText}</textarea>
                
                <div class="flex flex-wrap gap-3 mt-6">
                    <button id="voice-log-btn" onclick="VoiceInputService.start((text) => {
                        const textarea = document.getElementById('journal-text-input');
                        if (textarea) {
                            textarea.value += ' ' + text;
                            currentJournalText = textarea.value;
                        }
                    })" class="flex items-center space-x-2 p-3 bg-red-600 rounded-full hover:bg-red-700 transition-all duration-300 btn-hover">
                        <i data-lucide="mic" class="w-5 h-5 text-white"></i>
                        <span class="text-sm text-white">Voice Log</span>
                    </button>
                    
                    <button id="record-mp3-btn" onclick="VoiceRecorderService.toggleRecording()" class="flex items-center space-x-2 p-3 bg-orange-600 rounded-full hover:bg-orange-700 transition-all duration-300 btn-hover">
                        <i data-lucide="radio" class="w-5 h-5 text-white"></i>
                        <span class="text-sm text-white">Record MP3</span>
                    </button>

                    <button 
                        onclick="saveJournalEntry()"
                        class="px-5 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition-all duration-300 shadow-md btn-hover glow ml-auto">
                        Save Entry
                    </button>
                </div>
            </div>

            <!-- Recent Entries -->
            <h3 class="text-2xl font-semibold text-white mb-4 pb-2 border-b border-gray-700">Recent Entries</h3>
            <div id="journal-list" class="space-y-3">
                ${journalList}
            </div>
        </div>
    `;
    
    // Animate journal entries
    setTimeout(() => {
        const entries = document.querySelectorAll('.journal-entry');
        AnimationManager.stagger(entries, 'animate-fadeInUp', 150);
    }, 100);
    
    lucide.createIcons();
}

// ===== 3. Insights View =====
function getMoodAnalysis() {
    if (journalEntries.length < 2) {
        return null;
    }

    const moodData = journalEntries.slice(0, 7).map(entry => {
        const score = MOOD_SCORE_MAP[entry.mood] || 3;
        const date = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        return { score, date };
    }).reverse(); // Reverse to show chronological order

    return moodData;
}

function generateMoodGraph(moodData) {
    if (!moodData || moodData.length < 2) return '';

    const svgWidth = 600;
    const svgHeight = 160;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = svgWidth - padding.left - padding.right;
    const graphHeight = svgHeight - padding.top - padding.bottom;

    // Calculate points
    const xScale = graphWidth / (moodData.length - 1);
    const yScale = graphHeight / 4; // 5 mood levels, so 4 intervals

    const points = moodData.map((data, index) => {
        const x = padding.left + (index * xScale);
        const y = padding.top + graphHeight - ((data.score - 1) * yScale);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate date labels
    const dateLabels = moodData.map((data, index) => {
        const x = padding.left + (index * xScale);
        const date = data.date;
        const label = index === 0 || index === moodData.length - 1 ? 
            date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
        
        if (label) {
            return `
                <text x="${x}" y="${svgHeight - 5}" text-anchor="middle" class="text-xs fill-gray-400">
                    ${label}
                </text>
            `;
        }
        return '';
    }).join('');

    // Generate mood level labels
    const moodLabels = [1, 2, 3, 4, 5].map(level => {
        const y = padding.top + graphHeight - ((level - 1) * yScale);
        const emoji = Object.keys(MOOD_SCORE_MAP).find(key => MOOD_SCORE_MAP[key] === level) || '😶';
        return `
            <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="text-xs fill-gray-400">
                ${emoji}
            </text>
            <line x1="${padding.left}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" class="stroke-gray-700" stroke-width="1" stroke-dasharray="2,2"/>
        `;
    }).join('');

    return `
        <svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" class="mood-graph">
            <defs>
                <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                    <stop offset="25%" style="stop-color:#f97316;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#facc15;stop-opacity:1" />
                    <stop offset="75%" style="stop-color:#84cc16;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Grid and labels -->
            ${moodLabels}
            
            <!-- Graph line -->
            <path d="${points}" class="graph-line" fill="none"/>
            
            <!-- Data points -->
            ${moodData.map((data, index) => {
                const x = padding.left + (index * xScale);
                const y = padding.top + graphHeight - ((data.score - 1) * yScale);
                const color = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'][data.score - 1];
                return `
                    <circle cx="${x}" cy="${y}" r="4" class="graph-point" style="fill: ${color}">
                        <title>Mood: ${data.score}/5 - ${new Date(data.date).toLocaleDateString('en-IN')}</title>
                    </circle>
                `;
            }).join('')}
            
            <!-- Date labels -->
            ${dateLabels}
        </svg>
    `;
}

// ===== 4. Toolkit View =====
let breathingExerciseInterval = null;
let breathingCycle = 0;
let breathingState = 'in';

function startBreathingExercise() {
    const circle = document.getElementById('breathing-circle');
    const instructions = document.getElementById('breathing-instructions');
    const button = document.getElementById('breathing-button');
    
    if (breathingExerciseInterval) {
        // Stop exercise
        clearInterval(breathingExerciseInterval);
        breathingExerciseInterval = null;
        breathingCycle = 0;
        breathingState = 'in';
        
        circle.classList.remove('breathe-in', 'breathe-out');
        circle.style.transform = 'scale(1)';
        instructions.textContent = "Tap 'Start' to begin.";
        button.textContent = "Start Exercise";
        button.classList.remove('bg-red-600', 'hover:bg-red-700');
        button.classList.add('bg-purple-600', 'hover:bg-purple-700');
        return;
    }
    
    // Start exercise
    button.textContent = "Stop Exercise";
    button.classList.remove('bg-purple-600', 'hover:bg-purple-700');
    button.classList.add('bg-red-600', 'hover:bg-red-700');
    
    const totalCycles = CONFIG.BREATHING.CYCLES;
    
    function updateBreathing() {
        if (breathingCycle >= totalCycles) {
            clearInterval(breathingExerciseInterval);
            breathingExerciseInterval = null;
            breathingCycle = 0;
            breathingState = 'in';
            
            circle.classList.remove('breathe-in', 'breathe-out');
            circle.style.transform = 'scale(1)';
            instructions.textContent = "Exercise complete! 🎉";
            button.textContent = "Start Exercise";
            button.classList.remove('bg-red-600', 'hover:bg-red-700');
            button.classList.add('bg-purple-600', 'hover:bg-purple-700');
            return;
        }
        
        if (breathingState === 'in') {
            // Inhale
            circle.classList.remove('breathe-out');
            circle.classList.add('breathe-in');
            instructions.textContent = `🌬️ Inhale... (Cycle ${breathingCycle + 1}/${totalCycles})`;
            breathingState = 'hold';
            // Schedule next step based on CONFIG
            setTimeout(() => { if (breathingExerciseInterval) updateBreathing(); }, CONFIG.BREATHING.INHALE * 1000);
        } else if (breathingState === 'hold') {
            // Hold
            instructions.textContent = `⏸️ Hold...`;
            breathingState = 'out';
            setTimeout(() => { if (breathingExerciseInterval) updateBreathing(); }, CONFIG.BREATHING.HOLD * 1000);
        } else if (breathingState === 'out') {
            // Exhale
            circle.classList.remove('breathe-in');
            circle.classList.add('breathe-out');
            instructions.textContent = `😮‍💨 Exhale...`;
            breathingState = 'rest';
            setTimeout(() => { if (breathingExerciseInterval) updateBreathing(); }, CONFIG.BREATHING.EXHALE * 1000);
        } else {
            // Rest
            circle.classList.remove('breathe-out');
            breathingCycle++;
            if (breathingCycle < totalCycles) {
                instructions.textContent = `😌 Rest...`;
                breathingState = 'in';
                setTimeout(() => { if (breathingExerciseInterval) updateBreathing(); }, 2000); // Small rest
            } else {
                updateBreathing(); // Trigger completion
            }
        }
    }
    
    instructions.textContent = "Get ready...";
    breathingExerciseInterval = true; // Mark as running
    setTimeout(updateBreathing, 1000);
}

function startGroundingExercise() {
    showNotification('Starting grounding exercise...', 'info');
    
    const steps = [
        { emoji: '👀', text: 'Look around. Name 5 things you can see.' },
        { emoji: '✋', text: 'Notice 4 things you can feel or touch.' },
        { emoji: '👂', text: 'Listen for 3 things you can hear.' },
        { emoji: '👃', text: 'Find 2 things you can smell.' },
        { emoji: '👅', text: 'Notice 1 thing you can taste.' }
    ];
    
    let currentStep = 0;
    
    function nextStep() {
        if (currentStep < steps.length) {
            showNotification(`${steps[currentStep].emoji} ${steps[currentStep].text}`, 'info');
            currentStep++;
            setTimeout(nextStep, 10000); // 10 seconds per step
        } else {
            showNotification('Grounding exercise complete! 🌟', 'success');
        }
    }
    
    nextStep();
}

function startThoughtChallenge() {
    const template = `
Write down a negative thought you're having:
_________________________________________

Challenge it with these questions:
1. What evidence supports this thought?
2. What evidence contradicts it?
3. What's a more balanced perspective?
4. How would I advise a friend with this thought?

Alternative thought:
_________________________________________
    `;

    // Download as file
    downloadThoughtTemplate(template);
}

function downloadThoughtTemplate(template) {
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thought-challenge-template.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Template downloaded! 📥', 'success');
}

function generateAffirmation() {
    const affirmations = CONFIG.AFFIRMATIONS;
    const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    
    showNotification(`✨ ${randomAffirmation}`, 'success');
}

// Gratitude Jar uses curated prompts similar to daily affirmations.
const GRATITUDE_PROMPTS = [
    "What made you smile today?",
    "Name 1 person you're thankful for and why",
    "Something small that went well today",
    "A moment you felt proud of yourself",
    "Something beautiful you noticed today",
    "A comfort or cozy thing you enjoyed",
    "One thing your body did for you today",
    "A song, smell, or taste you loved recently",
    "Something you're looking forward to",
    "A kind word or gesture you received or gave",
    "A challenge you handled well",
    "Something in nature that caught your eye",
    "A favorite memory from this week",
    "One way you showed yourself care today",
    "Something you're excited to learn or try",
];

function openGratitudeJar() {
    const prompt = GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)];

    // Surface the prompt like a daily affirmation
    showNotification(`🌟 Gratitude prompt: ${prompt}`, 'success');

    // Drop user into journal with the prompt as a guide
    changeView('journal');
    setTimeout(() => {
        const textarea = document.querySelector('.journal-notepad textarea');
        if (textarea) {
            textarea.placeholder = `${prompt}\n\n(Or anything else you feel grateful for today 🌱)`;
            textarea.focus();
        }
    }, 400);
}

function renderToolkitView() {
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn max-w-2xl mx-auto">
            <p class="text-gray-400 mb-8 text-center">Therapist-approved tools for in-the-moment relief and growth.</p>
            
            <div class="grid grid-cols-2 gap-6">
                <!-- Breathing Exercise Card -->
                <div class="bg-[#161b22] p-8 rounded-3xl shadow-xl border border-purple-500/30 col-span-2">
                    <div class="flex items-center space-x-3 mb-2">
                        <i data-lucide="wind" class="w-8 h-8 text-purple-400"></i>
                        <h3 class="text-2xl font-bold text-white">4-4-6 Breathing</h3>
                    </div>
                    <p class="text-gray-400 mb-6">A powerful technique to calm your nervous system instantly.</p>
                    
                    <div class="flex flex-col items-center justify-center p-12 bg-[#0d1117] rounded-2xl mb-6 relative overflow-hidden">
                        <div id="breathing-circle" class="breathing-circle mb-8"></div>
                        <p id="breathing-instructions" class="text-xl font-bold text-white text-center">Tap 'Start' to begin.</p>
                    </div>
                    
                    <button id="breathing-button" onclick="startBreathingExercise()" class="w-full py-4 bg-purple-600 rounded-2xl font-black text-lg hover:bg-purple-700 transition-all duration-300 shadow-lg glow">
                        Start Exercise
                    </button>
                </div>

                <!-- Grounding Card -->
                <div class="bg-[#161b22] p-6 rounded-3xl shadow-xl border border-gray-800 flex flex-col">
                    <div class="flex items-center space-x-2 mb-3">
                        <i data-lucide="anchor" class="w-6 h-6 text-sky-400"></i>
                        <h3 class="text-xl font-bold text-sky-400">Grounding (5-4-3-2-1)</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">Reconnect with the present when anxiety hits hard.</p>
                    <ul class="text-xs text-gray-300 space-y-2 mb-6">
                        <li>👀 <strong>5</strong> things you see</li>
                        <li>🖐️ <strong>4</strong> things you feel</li>
                        <li>👂 <strong>3</strong> things you hear</li>
                    </ul>
                    <button onclick="startGroundingExercise()" class="w-full py-3 bg-[#0ea5e9] rounded-xl font-bold hover:bg-sky-600 transition-all mt-auto">
                        Start Guided Session
                    </button>
                </div>

                <!-- Thought Challenge Card -->
                <div class="bg-[#161b22] p-6 rounded-3xl shadow-xl border border-gray-800 flex flex-col relative overflow-hidden">
                    ${journalEntries.length < 5 ? `
                    <div class="absolute inset-0 bg-[#0d1117]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                        <i data-lucide="lock" class="w-8 h-8 text-gray-500 mb-2"></i>
                        <p class="text-xs font-bold text-gray-400">Unlocks after 5 entries</p>
                        <p class="text-[10px] text-gray-500 mt-1">${journalEntries.length}/5 completed</p>
                    </div>
                    ` : ''}
                    <div class="flex items-center space-x-2 mb-3">
                        <i data-lucide="swords" class="w-6 h-6 text-orange-400"></i>
                        <h3 class="text-xl font-bold text-orange-400">Daily Quests</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">Complete gamified wellness challenges to level up your mental health.</p>
                    <button onclick="startThoughtChallenge()" class="w-full py-3 bg-[#ea580c] rounded-xl font-bold hover:bg-orange-600 transition-all mt-auto">
                        Daily Quests
                    </button>
                </div>

                <!-- Positive Affirmations Card -->
                <div class="bg-[#161b22] p-6 rounded-3xl shadow-xl border border-gray-800 flex flex-col">
                    <div class="flex items-center space-x-2 mb-3">
                        <i data-lucide="heart" class="w-6 h-6 text-emerald-400"></i>
                        <h3 class="text-xl font-bold text-emerald-400">Daily Affirmation</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">Get a quick boost of positivity and self-love.</p>
                    <button onclick="generateAffirmation()" class="w-full py-3 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-all mt-auto">
                        Receive Affirmation
                    </button>
                </div>

                <!-- Gratitude Jar Card -->
                <div class="bg-[#161b22] p-6 rounded-3xl shadow-xl border border-gray-800 flex flex-col">
                    <div class="flex items-center space-x-2 mb-3">
                        <i data-lucide="star" class="w-6 h-6 text-pink-400"></i>
                        <h3 class="text-xl font-bold text-pink-400">Gratitude Jar</h3>
                    </div>
                    <p class="text-sm text-gray-400 mb-4">Practicing gratitude is proven to improve long-term mood.</p>
                    <button onclick="openGratitudeJar()" class="w-full py-3 bg-pink-600 rounded-xl font-bold hover:bg-pink-700 transition-all mt-auto">
                        Add to Jar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// Active Thought Challenge logic integration
function startThoughtChallenge() {
    const toolkitView = APP_CONTENT.querySelector('.pt-6');
    
    // Check if locked (requires at least 5 journal entries)
    if (journalEntries.length < 5) {
        toolkitView.innerHTML = `
            <div class="pt-2 animate-pageFadeIn max-w-2xl mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-black text-orange-400 flex items-center gap-3">
                        <i data-lucide="lock"></i> Quests Locked
                    </h3>
                    <button onclick="renderToolkitView()" class="text-gray-500 hover:text-white">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="bg-gray-800/40 p-12 rounded-3xl border border-gray-700 text-center">
                    <div class="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i data-lucide="book-open" class="w-10 h-10 text-gray-400"></i>
                    </div>
                    <h4 class="text-xl font-bold text-white mb-2">Build a Journaling Habit</h4>
                    <p class="text-gray-400 mb-8">Daily Quests unlock after you complete at least 5 journal entries. You currently have ${journalEntries.length}/5.</p>
                    <button onclick="changeView('journal')" class="px-8 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition-all">
                        Go to Journal
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    toolkitView.innerHTML = `
        <div class="pt-2 animate-pageFadeIn max-w-2xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-black text-orange-400 flex items-center gap-3">
                    <i data-lucide="swords"></i> Daily Quests
                </h3>
                <button onclick="renderToolkitView()" class="text-gray-500 hover:text-white">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <p class="text-gray-400 mb-6">Complete your daily wellness quests to level up.</p>
            
            <div id="itemsList" class="space-y-4 mb-10"></div>
            
            <div class="progress-section">
                <div class="flex justify-between text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">
                    <span>Quest Progress</span>
                    <span id="progText">0/5</span>
                </div>
                <div class="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div id="progFill" class="h-full w-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"></div>
                </div>
            </div>
        </div>
    `;
    
    const itemsList = document.getElementById('itemsList');
    const progFill = document.getElementById('progFill');
    const progText = document.getElementById('progText');
    
    // Get latest mood from journal entries
    const latestMoodEmoji = journalEntries.length > 0 ? journalEntries[0].mood : '😶';
    
    // Map emoji to mood key
    const moodMap = {
        '😀': 'happy',
        '😔': 'sad',
        '😶': 'neutral',
        '🤯': 'stressed',
        '😴': 'tired'
    };
    
    const moodKey = moodMap[latestMoodEmoji] || 'neutral';
    const questBank = CONFIG.THOUGHT_CHALLENGE.QUEST_BANK[moodKey] || CONFIG.THOUGHT_CHALLENGE.CHALLENGES;
    
    // Randomly select 5 tasks from the mood-specific bank
    const selected = [...questBank].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    selected.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'thought-item p-5 rounded-2xl flex flex-col gap-2 cursor-pointer opacity-0 translate-y-4 transition-all duration-300 bg-gray-800/40 border border-gray-700/50';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="custom-cb flex-shrink-0"></div>
                <span class="text-gray-200 font-medium">${item.task}</span>
            </div>
            <div class="reward-text hidden text-xs text-orange-400 font-bold ml-10 mt-1 animate-fadeIn">
                ${item.reward}
            </div>
        `;
        div.onclick = () => {
            const isChecked = div.classList.toggle('checked');
            const reward = div.querySelector('.reward-text');
            if (isChecked) {
                reward.classList.remove('hidden');
                showNotification('Quest Progress Updated! ⚡', 'success');
            } else {
                reward.classList.add('hidden');
            }
            updateThoughtProgress();
        };
        itemsList.appendChild(div);
        setTimeout(() => {
            div.classList.replace('opacity-0', 'opacity-100');
            div.classList.replace('translate-y-4', 'translate-y-0');
        }, i * 100);
    });

    function updateThoughtProgress() {
        const checked = itemsList.querySelectorAll('.thought-item.checked').length;
        const total = 5;
        const perc = (checked / total) * 100;
        progFill.style.width = `${perc}%`;
        progText.innerText = `${checked}/${total}`;
        
        if (checked === total) {
            setTimeout(showThoughtCompletion, 1000);
        }
    }

    function showThoughtCompletion() {
        toolkitView.innerHTML = `
            <div class="text-center py-20 animate-pageFadeIn">
                <div class="text-6xl mb-6">🏆</div>
                <h3 class="text-3xl font-black text-white mb-4">Level Up!</h3>
                <p class="text-xl text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
                    ${CONFIG.THOUGHT_CHALLENGE.COMPLETION_MESSAGE}
                </p>
                <button onclick="startThoughtChallenge()" class="px-10 py-4 bg-orange-600 rounded-2xl font-black hover:bg-orange-700 transition-all shadow-xl">New Quest Line</button>
                <button onclick="renderToolkitView()" class="block w-full mt-6 text-gray-500 hover:text-gray-300">Back to Toolkit</button>
            </div>
        `;
    }
    
    lucide.createIcons();
}

// ===== 5. Emergency Aid View =====
function renderAidView() {
    const safetyName = userProfile.safetyContactName || 'Not set';
    const safetyPhone = userProfile.safetyContactPhone || 'Not set';
    
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-red-400 mb-6 flex items-center space-x-2">
                <i data-lucide="alert-triangle" class="w-8 h-8 text-red-400 glow-red"></i>
                <span>Emergency Aid & Support</span>
            </h2>
            <p class="text-gray-400 mb-8">If you or someone you know is in immediate danger, please call emergency services immediately.</p>
            
            <!-- Your Safety Contact -->
            <div class="bg-red-900/30 p-6 rounded-2xl shadow-2xl mb-8 border-2 border-red-500/50 card-hover">
                <h3 class="text-xl font-bold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="heart" class="w-6 h-6"></i>
                    <span>Your Safety Contact</span>
                </h3>
                <p class="text-sm text-red-200 mb-6">This information is stored privately and only visible to you.</p>
                
                <div class="space-y-4">
                    <div class="bg-red-800/40 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p class="text-red-100 font-semibold">Contact Name</p>
                            <p class="text-red-200">${safetyName}</p>
                        </div>
                        <i data-lucide="user" class="w-5 h-5 text-red-300"></i>
                    </div>
                    
                    <div class="bg-red-800/40 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p class="text-red-100 font-semibold">Phone Number</p>
                            ${safetyPhone !== 'Not set' ? 
                                `<a href="tel:${safetyPhone}" class="text-red-200 hover:text-red-100 transition-colors duration-300">${safetyPhone}</a>` : 
                                `<p class="text-red-200">${safetyPhone}</p>`
                            }
                        </div>
                        <i data-lucide="phone" class="w-5 h-5 text-red-300"></i>
                    </div>
                </div>
                
                <button onclick="changeViewWithAnimation('settings')" class="mt-6 w-full px-4 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-all duration-300 shadow-md btn-hover">
                    Update Safety Contact
                </button>
            </div>

            <!-- Indian Crisis Helplines -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6 card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="phone-call" class="w-6 h-6 text-green-400"></i>
                    <span>24×7 Crisis Helplines (India)</span>
                </h3>
                <p class="text-sm text-gray-400 mb-4">Free, confidential, and available 24/7. You are not alone.</p>
                
                <div class="space-y-4">
                    ${CONFIG.INDIAN_HOTLINES.map(hotline => {
                        const isEmergency = hotline.type === 'emergency';
                        const numbers = hotline.numbers || [hotline.number];
                        return `
                            <div class="${isEmergency ? 'bg-red-900/30 border border-red-500/30' : 'bg-gray-900'} p-4 rounded-xl hover:bg-opacity-80 transition-all duration-300">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <p class="font-bold ${isEmergency ? 'text-red-300' : 'text-white'}">${hotline.name}</p>
                                        <p class="text-sm ${isEmergency ? 'text-red-200/80' : 'text-gray-400'}">${hotline.description}</p>
                                    </div>
                                    <span class="text-xs ${isEmergency ? 'bg-red-800 text-red-100' : (hotline.hours === '24/7' ? 'bg-green-900 text-green-300' : 'bg-purple-900 text-purple-300')} px-2 py-1 rounded-full">${hotline.hours}</span>
                                </div>
                                <div class="${numbers.length > 1 ? 'grid grid-cols-2 gap-3' : ''}">
                                    ${numbers.map(num => `
                                        <a href="tel:${num.replace(/\s/g, '').replace(/-/g, '')}" class="${isEmergency ? 'text-xl bg-red-700 text-white' : 'text-lg bg-blue-900/30 text-blue-400'} font-bold hover:scale-[1.02] transition-all duration-300 block text-center py-2 rounded-lg">
                                            ${num}
                                        </a>
                                    `).join('')}
                                </div>
                                <p class="text-[10px] ${isEmergency ? 'text-red-300/70' : 'text-gray-500'} mt-2 text-center">
                                    ${hotline.type.toUpperCase()} | ${hotline.languages || (hotline.features ? hotline.features.join(' | ') : 'Support')}
                                </p>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="mt-6 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p class="text-sm text-gray-400 text-center">
                        <i data-lucide="shield" class="w-4 h-4 inline mr-1"></i>
                        These services are confidential, free, and here to support you
                    </p>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== 6. Vent Room View =====
let isSavingVent = false;

async function handleVentSubmit(event) {
    event.preventDefault();
    
    if (isSavingVent) return;
    
    const input = document.getElementById('vent-input');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('Please write something to vent', 'error');
        return;
    }
    
    if (text.length > 500) {
        showNotification('Vent message is too long (max 500 characters)', 'error');
        return;
    }
    
    isSavingVent = true;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>';
    submitBtn.disabled = true;
    
    try {
        await saveVentMessage(text);
        input.value = '';
        
        // Reset button after delay
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            isSavingVent = false;
        }, 1000);
        
    } catch (error) {
        console.error('Error saving vent:', error);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        isSavingVent = false;
        showNotification('Failed to save vent. Please try again.', 'error');
    }
}

function renderVentView() {
    const ventWs = typeof VentSocket !== 'undefined' ? VentSocket : null;
    const myId = ventWs ? ventWs.myId : (window.uniqueUserId || window.userId);
    const memberCount = ventWs ? ventWs.memberCount : 1;
    const isConnected = ventWs && ventWs.connected;
    const isConnecting = ventWs && ventWs._connecting;

    // Try to reconnect when user opens Vent and we're disconnected
    if (ventWs && !ventWs.connected && !ventWs._connecting && ventWs.reconnectAttempts < ventWs.maxReconnectAttempts) {
        ventWs.connect();
    }

    const chatBubbles = ventMessages.map((msg, index) => {
        const localClientId = window.uniqueUserId || window.userId || '';
        const isSelf = (msg.clientId && msg.clientId === localClientId) || (msg.userId === (myId || window.userId));
        const displayName = isSelf ? 'You' : `Anon-${(msg.userId || 'xxxx').substring(0, 4)}`;

        let dateObj;
        if (msg.timestamp instanceof Date) {
            dateObj = msg.timestamp;
        } else if (msg.timestamp && typeof msg.timestamp === 'object' && msg.timestamp.seconds) {
            dateObj = new Date(msg.timestamp.seconds * 1000);
        } else if (typeof msg.timestamp === 'string') {
            dateObj = new Date(msg.timestamp);
        } else {
            dateObj = new Date();
        }

        const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const markdownHtml = renderMarkdown(msg.text || '');

        return `
            <div class="vent-message" style="animation-delay: ${index * 50}ms">
                <div class="flex ${isSelf ? 'justify-end' : 'justify-start'} mb-4">
                    <div class="max-w-xs sm:max-w-md p-4 text-sm ${isSelf ? 'message-bubble-user' : 'message-bubble-auri'}">
                        <div class="font-bold text-xs mb-1 ${isSelf ? 'text-blue-300' : 'text-purple-400'}">
                            ${displayName}
                        </div>
                        <div class="text-gray-100 text-sm leading-relaxed break-words">${markdownHtml}</div>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-xs opacity-50">${timeStr}</span>
                            ${isSelf ? '<span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">You</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const statusText = isConnected ? '● Live' : (isConnecting ? 'Connecting...' : '● Polling 500ms');
    const statusClass = isConnected ? 'text-emerald-400' : (isConnecting ? 'text-amber-400' : 'text-sky-400');
    const healthy = ventHealthStatus.api === 'ok' && ventHealthStatus.db === 'ok';
    const healthText = healthy ? 'API/DB OK' : `API ${ventHealthStatus.api.toUpperCase()} • DB ${ventHealthStatus.db.toUpperCase()}`;
    const healthClass = healthy ? 'text-emerald-400' : 'text-amber-400';

    APP_CONTENT.innerHTML = `
        <div class="pt-6 flex flex-col animate-pageFadeIn max-w-2xl mx-auto pb-6 space-y-4">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <h2 class="text-3xl font-bold text-white flex items-center space-x-2">
                    <i data-lucide="message-square-text" class="w-8 h-8 text-purple-400"></i>
                    <span>The Vent Room</span>
                </h2>
                <div class="flex items-center gap-2">
                    <span id="vent-ws-status" class="text-[10px] font-medium ${statusClass}">${statusText}</span>
                    <span id="vent-health-status" class="text-[10px] font-medium ${healthClass}">${healthText}</span>
                    <div id="vent-member-count" class="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30">
                        ${memberCount}/50 online
                    </div>
                </div>
            </div>
            <p class="text-sm text-gray-400 mb-4 max-w-2xl">
                Let it all out! This space is shared publicly with other users. 
                <strong class="text-red-400">Please be kind, supportive, and completely anonymous.</strong> 
                Messages are limited to the last 50.
            </p>
            
            <div id="vent-chat-container" class="mt-2 px-1 py-2 min-h-[140px] space-y-3">
                ${ventMessages.length > 0 ? chatBubbles : 
                    `<div class="p-8 text-center text-gray-500 animate-fadeIn">
                        <i data-lucide="wind" class="w-12 h-12 mx-auto mb-4 text-purple-600"></i>
                        <p class="mb-2">It's quiet in here...</p>
                        <p class="text-sm text-gray-400">Be the first to vent! 🗣️</p>
                    </div>`
                }
            </div>
            
            <form onsubmit="handleVentSubmit(event)" class="pt-2">
                <div class="flex items-center space-x-3 rounded-3xl border border-gray-800/70 bg-gradient-to-r from-slate-950/80 to-slate-900/80 px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                    <textarea 
                        id="vent-input" 
                        placeholder="I need to get something off my chest..."
                        class="flex-grow p-4 text-gray-200 bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 text-base shadow-xl animated-textarea resize-none transition-all duration-300"
                        rows="2"
                        maxlength="500"
                    ></textarea>
                    <button type="submit" class="p-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-lg btn-hover glow self-end">
                        <i data-lucide="send" class="w-6 h-6 text-white"></i>
                    </button>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-500">
                        <i data-lucide="shield" class="w-3 h-3 inline mr-1"></i>
                        You're anonymous
                    </span>
                    <span id="vent-char-count" class="text-xs text-gray-500">0/500</span>
                </div>
            </form>
        </div>
    `;
    
    // Add character count functionality
    const ventInput = document.getElementById('vent-input');
    const charCount = document.getElementById('vent-char-count');
    
    if (ventInput && charCount) {
        ventInput.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length}/500`;
            charCount.className = `text-xs ${length >= 450 ? 'text-red-400' : length >= 400 ? 'text-yellow-400' : 'text-gray-500'}`;
        });
    }
    
    // Animate vent messages
    setTimeout(() => {
        const messages = document.querySelectorAll('.vent-message');
        AnimationManager.stagger(messages, 'animate-fadeIn', 80);
    }, 100);
    
    scrollToBottom('vent-chat-container');
    lucide.createIcons();
}

// ===== Email Service Mock =====
const MeloEmailHandler = {
    senderEmail: 'adienpearce4@gmail.com',
    sendWelcomeEmail: async function(email, userName) {
        console.log(`Simulating sending welcome email from ${this.senderEmail} to ${email}...`);
        
        const welcomeText = `Melo represents a paradigm shift in digital mental health by integrating cutting-edge artificial intelligence with human-centered design principles. The platform's core innovation lies in its hybrid care model that combines: (1) an emotionally intelligent AI guide named Auri, powered by advanced natural language processing and machine learning algorithms; (2) a secure, gamified journaling system with mood tracking capabilities; (3) moderated peer support communities called Vent Rooms; and (4) professional therapist oversight through a dedicated dashboard interface.`;
        
        const instructions = `
How to use Melo:
- Chat with Auri: Use the Sparkles icon to talk to your AI guide.
- Daily Journal: Use the Book icon to log your thoughts and mood.
- Insights: Track your mental health progress over time.
- Vent Rooms: Share your thoughts anonymously with the community.
        `;

        // In a real app, this would be an API call to a backend
        setTimeout(() => {
            showNotification(`Welcome email sent to ${email} (via ${this.senderEmail})! 📧`, 'success');
            
            // Add a welcome message from Auri as well
            saveMessage('Auri', `Hey ${userName || 'there'}! I've sent a welcome email from ${this.senderEmail} to ${email}. ${welcomeText} \n\n${instructions}`);
        }, 1500);
    }
};

function handleProfileSave(event) {
    event.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const safetyName = document.getElementById('safety-contact-name').value;
    const safetyPhone = document.getElementById('safety-contact-phone').value;
    
    const oldEmail = userProfile.email;
    
    // Validate phone number if provided
    if (safetyPhone && safetyPhone !== 'Not set') {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
        if (!phoneRegex.test(safetyPhone.replace(/\s/g, ''))) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }
    }
    
    saveProfileData({ 
        name: name, 
        email: email, 
        safetyContactName: safetyName, 
        safetyContactPhone: safetyPhone 
    });

    // If email is newly added, send welcome email
    if (email && email !== oldEmail) {
        MeloEmailHandler.sendWelcomeEmail(email, name);
    }
}

function handleExportData() {
    const data = {
        userProfile,
        journalEntries,
        auriHistory,
        ventMessages,
        exportDate: new Date().toISOString(),
        appVersion: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melo-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully! 📥', 'success');
}

function handleDeleteData() {
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear in-memory data
        auriHistory = [];
        journalEntries = [];
        ventMessages = [];
        userProfile = {
            name: '',
            email: '',
            safetyContactName: '',
            safetyContactPhone: ''
        };
        
        // Generate new user ID
        const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        window.userId = newUserId;
        window.uniqueUserId = newUserId;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, newUserId);
        
        showNotification('All data deleted successfully', 'success');
        renderSettingsView();
    }
}

function renderSettingsView() {
    const userId = window.uniqueUserId || window.userId || 'Not available';
    const shortId = userId;
    
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-8 flex items-center space-x-2">
                <i data-lucide="settings" class="w-8 h-8 text-purple-400"></i>
                <span>Account Settings</span>
            </h2>
            
            <!-- User Profile -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="user" class="w-6 h-6"></i>
                    <span>Edit Profile & Data</span>
                </h3>
                
                <form onsubmit="handleProfileSave(event)" class="space-y-4">
                    <div>
                        <label for="profile-name" class="block text-sm font-medium text-gray-300 mb-2">
                            Your Name (Optional)
                        </label>
                        <input type="text" id="profile-name" value="${userProfile.name || ''}" 
                               placeholder="Your preferred name" 
                               class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 animated-textarea">
                    </div>
                    
                    <div>
                        <label for="profile-email" class="block text-sm font-medium text-gray-300 mb-2">
                            Email / Contact (Optional)
                        </label>
                        <input type="email" id="profile-email" value="${userProfile.email || ''}" 
                               placeholder="Your email or contact info" 
                               class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 animated-textarea">
                    </div>
                    
                    <div class="pt-4 border-t border-gray-700">
                        <h4 class="text-lg font-semibold text-red-400 mb-3 flex items-center space-x-2">
                            <i data-lucide="shield" class="w-5 h-5"></i>
                            <span>Emergency Contact (Private)</span>
                        </h4>
                        <p class="text-sm text-gray-400 mb-4">
                            This info is stored securely and only used to display on your <strong>Aid</strong> page for quick access.
                        </p>
                        
                        <div class="space-y-4">
                            <div>
                                <label for="safety-contact-name" class="block text-sm font-medium text-gray-300 mb-2">
                                    Contact Name
                                </label>
                                <input type="text" id="safety-contact-name" value="${userProfile.safetyContactName || ''}" 
                                       placeholder="E.g., Mom, Best Friend" 
                                       class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500 animated-textarea">
                            </div>
                            
                            <div>
                                <label for="safety-contact-phone" class="block text-sm font-medium text-gray-300 mb-2">
                                    Contact Phone Number
                                </label>
                                <input type="tel" id="safety-contact-phone" value="${userProfile.safetyContactPhone || ''}" 
                                       placeholder="E.g., 9876543210" 
                                       class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500 animated-textarea">
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full px-5 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition-all duration-300 shadow-md btn-hover glow mt-6">
                        Save Profile Changes
                    </button>
                </form>
            </div>

            <!-- App Info -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-gray-700 card-hover">
                <h3 class="text-xl font-semibold text-sky-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="info" class="w-6 h-6"></i>
                    <span>App Information</span>
                </h3>
                
                <div class="space-y-4">
                    <div class="bg-gray-700 p-3 rounded-lg">
                        <p class="text-sm text-gray-300 mb-1">Your Unique User ID:</p>
                        <p class="text-purple-400 font-mono text-sm break-all">${shortId}</p>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-700">
                        <span class="text-gray-300">Auri Type:</span>
                        <span class="text-purple-300 font-semibold">Supportive</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-700">
                        <span class="text-gray-300">App Version:</span>
                        <span class="text-gray-400">1.0.0</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2">
                        <span class="text-gray-300">Data Status:</span>
                        <span class="text-green-400 font-semibold">${window.db ? 'Online' : 'Local Only'}</span>
                    </div>
                </div>

                <button onclick="changeView('about')" class="w-full mt-6 px-4 py-3 bg-gray-700 text-purple-300 rounded-xl font-medium hover:bg-gray-600 transition-all flex items-center justify-center space-x-2">
                    <i data-lucide="info" class="w-5 h-5"></i>
                    <span>About Melo & Creators</span>
                </button>
            </div>
            </div>

            <!-- Privacy & Data -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                    <span>Privacy & Data</span>
                </h3>
                
                <div class="space-y-3">
                    <button onclick="handleExportData()" class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 flex items-center justify-between group">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="download" class="w-5 h-5 text-purple-400"></i>
                            <span class="text-gray-300">Export My Data</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-300"></i>
                    </button>
                    
                    <button onclick="alert('Privacy policy will be displayed here.')" class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 flex items-center justify-between group">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="file-text" class="w-5 h-5 text-blue-400"></i>
                            <span class="text-gray-300">View Privacy Policy</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors duration-300"></i>
                    </button>
                    
                    <button onclick="handleDeleteData()" class="w-full text-left p-3 bg-red-900/30 hover:bg-red-800/40 rounded-lg transition-all duration-300 flex items-center justify-between group border border-red-500/30">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="trash-2" class="w-5 h-5 text-red-400"></i>
                            <span class="text-red-300">Delete All My Data</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors duration-300"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== ADMIN PANEL =====
async function showAdminPanel() {
    if (AdminAuth.isAuthenticated()) {
        renderAdminPanel();
    } else {
        const password = prompt('Enter Admin Password:', '');
        if (password !== null) {
            const result = await AdminAuth.login(password);
            if (result.success) {
                showNotification('Admin authenticated! 🔐', 'success');
                renderAdminPanel();
            } else {
                showNotification(result.message || 'Invalid password!', 'error');
            }
        }
    }
}

function renderAdminPanel() {
    const stats = {
        totalJournalEntries: journalEntries.length,
        totalVentMessages: ventMessages.length,
        activeUsers: MessagingService.activeUsers.size
    };

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-3xl font-bold text-white flex items-center space-x-2">
                    <i data-lucide="shield" class="w-8 h-8 text-purple-400"></i>
                    <span>Admin Control Panel</span>
                </h2>
                <button onclick="AdminAuth.logout(); changeView('auri'); showNotification('Admin session ended', 'info')" class="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300">
                    Exit Admin
                </button>
            </div>

            <!-- System Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-blue-600">
                    <p class="text-sm text-gray-400 mb-1">Journal Entries</p>
                    <p class="text-3xl font-bold text-blue-400">${stats.totalJournalEntries}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-green-600">
                    <p class="text-sm text-gray-400 mb-1">Vent Messages</p>
                    <p class="text-3xl font-bold text-green-400">${stats.totalVentMessages}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-orange-600">
                    <p class="text-sm text-gray-400 mb-1">Active Sessions</p>
                    <p class="text-3xl font-bold text-orange-400">${stats.activeUsers}</p>
                </div>
            </div>

            <!-- Vent Room Management -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="users" class="w-6 h-6"></i>
                    <span>Vent Room Management</span>
                </h3>
                
                <div class="space-y-4">
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-gray-300 mb-3">Active Users in Vent Room: <span class="font-bold text-purple-400">${MessagingService.getActiveUsers('main-vent').length}</span></p>
                        <div class="space-y-2">
                            ${MessagingService.getActiveUsers('main-vent').map(user => `
                                <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
                                    <span class="text-sm">${user.userName}</span>
                                    <span class="text-xs text-gray-400">${user.messageCount} msgs</span>
                                </div>
                            `).join('') || '<p class="text-gray-400 text-sm">No active users</p>'}
                        </div>
                    </div>
                    
                    <button onclick="handleClearVentRoom()" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300">
                        Clear All Vent Messages
                    </button>
                </div>
            </div>

            <!-- Data Export -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="download" class="w-6 h-6"></i>
                    <span>Data Export & Reports</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onclick="ExportService.exportJournalAsJSON(journalEntries)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="file-json" class="w-5 h-5"></i>
                        <span>Export Journal (JSON)</span>
                    </button>
                    
                    <button onclick="ExportService.exportJournalAsCSV(journalEntries)" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="table" class="w-5 h-5"></i>
                        <span>Export Journal (CSV)</span>
                    </button>
                    
                    <button onclick="GraphExport.exportGraphAsSVG(getMoodAnalysis())" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="download" class="w-5 h-5"></i>
                        <span>Export Graph (SVG)</span>
                    </button>
                    
                    <button onclick="GraphExport.exportGraphAsPNG(getMoodAnalysis())" class="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="image" class="w-5 h-5"></i>
                        <span>Export Graph (PNG)</span>
                    </button>
                </div>
            </div>

            <!-- Security -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl border border-red-500/30">
                <h3 class="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                    <span>Security Settings</span>
                </h3>
                
                <div class="space-y-4">
                    <button onclick="showChangePasswordDialog()" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-all duration-300">
                        Change Admin Password
                    </button>
                    
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-sm text-gray-300">Session Active Since:</p>
                        <p class="text-purple-400 font-mono">${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

function showChangePasswordDialog() {
    const currentPassword = prompt('Enter current admin password:');
    if (currentPassword === null) return;

    if (currentPassword !== AdminAuth.defaultPassword) {
        showNotification('Incorrect current password!', 'error');
        return;
    }

    const newPassword = prompt('Enter new admin password (minimum 6 characters):');
    if (newPassword === null) return;

    const result = AdminAuth.changePassword(newPassword);
    if (result.success) {
        showNotification(result.message, 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

function handleClearVentRoom() {
    if (confirm('Are you sure you want to clear all vent messages? This action cannot be undone.')) {
        MessagingService.clearRoomMessages('main-vent');
        ventMessages = [];
        localStorage.removeItem(CONFIG.STORAGE_KEYS.VENT_MESSAGES);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.VENT_MESSAGES);
        showNotification('Vent room cleared!', 'success');
        renderAdminPanel();
    }
}

// ===== ENHANCED INSIGHTS WITH DOWNLOADS =====
function renderInsightsViewEnhanced() {
    const moodData = getMoodAnalysis();
    const totalEntries = journalEntries.length;
    const today = new Date();
    const last7Days = journalEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        const diffTime = Math.abs(today - entryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    if (totalEntries === 0) {
        APP_CONTENT.innerHTML = `
            <div class="pt-6 text-center animate-pageFadeIn">
                <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                    <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                    <span>Mental Wellness Insights</span>
                </h2>
                <div class="bg-gray-800 p-8 rounded-2xl shadow-xl mt-12 card-hover">
                    <i data-lucide="database" class="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse"></i>
                    <h3 class="text-xl font-semibold text-white mb-2">Start journaling to see insights!</h3>
                    <p class="text-gray-400 mb-4">Log your moods and thoughts in the Journal to track your emotional patterns.</p>
                    <button onclick="changeViewWithAnimation('journal')" class="mt-4 px-5 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition-all duration-300 btn-hover glow">
                        Go to Journal
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const moodCounts = {};
    let totalScore = 0;
    
    journalEntries.forEach(entry => {
        const score = MOOD_SCORE_MAP[entry.mood] || 3;
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        totalScore += score;
    });
    
    const averageMood = (totalScore / totalEntries).toFixed(1);
    let mostCommonMood = '😶';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMood = mood;
        }
    });

    const graphHTML = moodData ? generateMoodGraph(moodData) : `
        <div class="p-8 text-center text-gray-500">
            <p>Need 2+ entries for mood graph 📊</p>
        </div>
    `;

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white flex items-center space-x-2">
                    <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                    <span>Mental Wellness Insights</span>
                </h2>
                <div class="flex gap-2">
                    <button onclick="GraphExport.exportGraphAsSVG(getMoodAnalysis())" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download as SVG">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>SVG</span>
                    </button>
                    <button onclick="GraphExport.exportGraphAsPNG(getMoodAnalysis())" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download as PNG">
                        <i data-lucide="image" class="w-4 h-4"></i>
                        <span>PNG</span>
                    </button>
                    <button onclick="exportInsightsReport()" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download Report">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                        <span>Report</span>
                    </button>
                </div>
            </div>
            
            <!-- Stats Overview -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Total Entries</p>
                    <p class="text-2xl font-bold text-white">${totalEntries}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Last 7 Days</p>
                    <p class="text-2xl font-bold text-white">${last7Days}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Avg Mood</p>
                    <p class="text-2xl font-bold text-white">${averageMood}/5</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Common Mood</p>
                    <p class="text-2xl font-bold">${mostCommonMood}</p>
                </div>
            </div>

            <!-- Mood Graph -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="line-chart" class="w-6 h-6"></i>
                    <span>Mood Trends</span>
                </h3>
                ${graphHTML}
            </div>

            <!-- Mood Breakdown -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="pie-chart" class="w-6 h-6"></i>
                    <span>Mood Distribution</span>
                </h3>
                <div class="space-y-4">
                    ${Object.entries(moodCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([mood, count]) => {
                            const percentage = ((count / totalEntries) * 100).toFixed(1);
                            const score = MOOD_SCORE_MAP[mood] || 3;
                            const barColor = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'][score - 1];
                            
                            return `
                                <div class="flex items-center">
                                    <span class="text-2xl w-10">${mood}</span>
                                    <div class="flex-grow ml-4">
                                        <div class="flex justify-between text-sm mb-1">
                                            <span class="text-gray-300">${count} entries</span>
                                            <span class="text-gray-400">${percentage}%</span>
                                        </div>
                                        <div class="w-full bg-gray-700 rounded-full h-2">
                                            <div class="h-2 rounded-full progress-bar" style="width: ${percentage}%; background: ${barColor};"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>

            <!-- Mood History -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="history" class="w-6 h-6 text-purple-400"></i>
                    <span>Recent Mood History</span>
                </h3>
                <div class="space-y-3">
                    ${journalEntries.slice(0, 10).map(entry => {
                        const date = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
                        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        
                        return `
                            <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
                                <div class="flex items-center space-x-3">
                                    <span class="text-2xl">${entry.mood}</span>
                                    <div>
                                        <p class="text-sm font-medium text-gray-200 truncate max-w-[150px] sm:max-w-xs">
                                            ${entry.text || 'No text entry'}
                                        </p>
                                        <p class="text-[10px] text-gray-500">${dateStr} • ${timeStr}</p>
                                    </div>
                                </div>
                                <div class="text-xs font-bold ${['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-green-400'][(MOOD_SCORE_MAP[entry.mood] || 3) - 1]}">
                                    ${(MOOD_SCORE_MAP[entry.mood] || 3)}/5
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

function exportInsightsReport() {
    const moodData = getMoodAnalysis();
    const totalEntries = journalEntries.length;
    const averageMood = (journalEntries.reduce((sum, e) => sum + (MOOD_SCORE_MAP[e.mood] || 3), 0) / totalEntries).toFixed(1);
    
    const moodCounts = {};
    journalEntries.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    let mostCommonMood = '😶';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMood = mood;
        }
    });

    const today = new Date();
    const last7Days = journalEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        const diffTime = Math.abs(today - entryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    const stats = {
        totalEntries: totalEntries,
        averageMood: averageMood,
        last7Days: last7Days,
        mostCommonMood: mostCommonMood,
        moodLabel: averageMood >= 4 ? 'Great' : averageMood >= 3 ? 'Good' : 'Needs Support'
    };

    GraphExport.exportGraphWithAnalysis(moodData, stats);
}

// ===== Main Render Function =====
function renderView() {
    if (!APP_CONTENT) return;

    switch (currentView) {
        case 'auri':
            renderAuriView();
            break;
        case 'journal':
            renderJournalView();
            break;
        case 'insights': 
            renderInsightsViewEnhanced();
            break;
        case 'toolkit':
            renderToolkitView();
            break;
        case 'aid':
            renderAidView();
            break;
        case 'vent': 
            renderVentView();
            break;
        case 'settings':
            renderSettingsView();
            break;
        case 'admin':
            renderAdminPanel();
            break;
        default:
            renderAuriView();
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ===== Initialize App =====
let appInitialized = false;

async function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;

    console.log("🚀 Melo initializing...");

    // Check if we are on the app page
    const appContent = document.getElementById('app-content');
    if (!appContent) {
        console.error("❌ APP_CONTENT element not found. Skipping app initialization.");
        return;
    }

    // Initialize Services
    try {
        if (window.PushNotificationService) window.PushNotificationService.init();
        if (window.VoiceInputService) window.VoiceInputService.init();
        if (typeof MessagingService !== 'undefined' && window.userId) {
            MessagingService.initializeRoom('main-vent', 'Main Vent Room');
            MessagingService.addUserToRoom(window.userId, 'User #' + window.userId.substring(0, 6), 'main-vent', true);
        }
    } catch (e) {
        console.error("Error initializing services:", e);
    }
    
    // Load local data if available (vent room uses server as single source of truth when connected)
    try {
        const savedAuriHistory = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AURI_HISTORY) || localStorage.getItem(CONFIG.STORAGE_KEYS.AURI_HISTORY);
        const savedJournalEntries = sessionStorage.getItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES) || localStorage.getItem(CONFIG.STORAGE_KEYS.JOURNAL_ENTRIES);
        const savedVentMessages = sessionStorage.getItem(CONFIG.STORAGE_KEYS.VENT_MESSAGES) || localStorage.getItem(CONFIG.STORAGE_KEYS.VENT_MESSAGES);
        const savedUserProfile = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE) || localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE);

        if (savedAuriHistory) auriHistory = JSON.parse(savedAuriHistory);
        if (savedJournalEntries) journalEntries = JSON.parse(savedJournalEntries);
        // Only load vent from localStorage when VentSocket isn't available (e.g. static/offline).
        // Otherwise server init will provide shared history for all users.
        if (typeof VentSocket === 'undefined' && savedVentMessages) {
            setVentMessages(JSON.parse(savedVentMessages), { forceRender: true });
        }
        if (savedUserProfile) userProfile = JSON.parse(savedUserProfile);

        if (auriHistory.length === 0) {
            auriHistory.push({ ...WELCOME_MESSAGE });
        }
    } catch (error) {
        console.error('Error loading local data:', error);
    }
    
    // Update user ID display
    const displayId = window.uniqueUserId || window.userId;
    if (displayId) {
        const userIdDisplay = document.getElementById('user-id-display');
        const userIdText = document.getElementById('user-id-text');
        if (userIdDisplay && userIdText) {
            userIdText.textContent = `${displayId.substring(0, 10)}...`;
            userIdDisplay.title = `Full ID: ${displayId}`;
            userIdDisplay.classList.remove('hidden');
        } else if (userIdDisplay) {
            userIdDisplay.textContent = `ID: ${displayId.substring(0, 8)}...`;
            userIdDisplay.classList.remove('hidden');
        }
    }
    
    // Show mode banner
    showModeBanner();
    
    const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGGED_IN) === 'true';
    if (!isLoggedIn) {
        // Default to guest access so melo.html always opens directly.
        localStorage.setItem('melo_access_mode', 'guest');
        localStorage.setItem(CONFIG.STORAGE_KEYS.LOGGED_IN, 'true');
    }
    changeView('auri', false);
    
    // Connect to database
    initializeMongoDBData();
    
    // Initialize offline detection
    window.addEventListener('online', () => {
        showNotification('Back online! Syncing data...', 'success');
        setTimeout(() => {
            initializeMongoDBData();
        }, 1000);
    });
    
    window.addEventListener('offline', () => {
        showNotification('You are offline. Working locally...', 'info');
    });
    
    // Initialize Navigation Scroll behavior
    setupNavScroll();
    
    console.log("✅ Melo fully initialized!");
}

document.addEventListener('auth-ready', () => {
    console.log('✅ Auth ready event received');
    initializeApp();
});

function scheduleInitFallback(delayMs = 3000) {
    setTimeout(() => {
        if (appInitialized) return;

        // If the page is still verifying auth (e.g. /api/me), don't start early and bounce to login.
        if (window.__MELO_AUTH_BOOTSTRAP_IN_PROGRESS) {
            scheduleInitFallback(1500);
            return;
        }

        console.warn('⚠️ App initialization delayed. Starting now...');
        initializeApp();
    }, delayMs);
}
scheduleInitFallback(3000);

window.changeView = changeView;
window.goBack = goBack;
window.showAdminPanel = showAdminPanel;
window.showNotification = showNotification;
window.scrollToBottom = scrollToBottom;
window.renderView = renderView;
window.handleAuriSubmit = handleAuriSubmit;
window.setMood = setMood;
window.saveJournalEntry = saveJournalEntry;
window.deleteJournalEntry = deleteJournalEntry;
window.exportJournal = exportJournal;
window.changeViewWithAnimation = changeViewWithAnimation;
window.handleVentSubmit = handleVentSubmit;
window.handleProfileSave = handleProfileSave;
window.handleExportData = handleExportData;
window.handleDeleteData = handleDeleteData;
window.handleClearVentRoom = handleClearVentRoom;
window.startBreathingExercise = startBreathingExercise;
window.startGroundingExercise = startGroundingExercise;
window.startThoughtChallenge = startThoughtChallenge;
window.exportJournalEntry = exportJournalEntry;
window.showChangePasswordDialog = showChangePasswordDialog;
window.getMoodAnalysis = getMoodAnalysis;
window.exportInsightsReport = exportInsightsReport;