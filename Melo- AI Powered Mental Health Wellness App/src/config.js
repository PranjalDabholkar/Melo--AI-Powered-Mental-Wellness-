// ===== Melo Application Configuration =====

const CONFIG = {
    // App Information
    APP_NAME: "Melo",
    VERSION: "1.0.0",
    BUILD: "2024.10.24",

    // Production: base URL for redirects when deployed (avoids localhost redirects on Vercel).
    // When host is vercel.app we use this; leave empty to use current origin.
    APP_ORIGIN: typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')
        ? (window.location.protocol + '//' + window.location.hostname)
        : '',
    // Optional external API base. Keep empty to use same-origin /api routes.
    API_ORIGIN: '',
    
    // API Configuration
    API_KEY: "AIzaSyAThdoZh981Flk3V-Jc1vXVnuNj5hrPmwc",
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
    API_TIMEOUT: 6000,
    
    // Feature Flags
    FEATURES: {
        AURI_CHAT: true,
        JOURNAL: true,
        INSIGHTS: true,
        TOOLKIT: true,
        AID: true,
        VENT_ROOM: true,
        SETTINGS: true
    },
    
    // User Settings Defaults
    DEFAULT_SETTINGS: {
        theme: "dark",
        notifications: true,
        auriType: "supportive",
        emergencyContact: {
            name: "",
            phone: ""
        }
    },
    
    // Mood Configuration
    MOOD_SCORE_MAP: {
        '🤯': 1,
        '😔': 2,
        '😶': 3,
        '😴': 4,
        '😀': 5
    },
    
    // Breathing Exercise Configuration
    BREATHING: {
        INHALE: 4,
        HOLD: 4,
        EXHALE: 6,
        CYCLES: 5
    },

    // Toolkit Resources
    AFFIRMATIONS: [
        "I am capable of handling whatever this day brings.",
        "My feelings are valid, but they do not define my reality.",
        "I deserve peace, love, and happiness.",
        "I am growing and learning every single day.",
        "I have the power to create change in my life.",
        "I am enough, exactly as I am.",
        "I choose to be kind to myself today.",
        "This moment is temporary; I am resilient.",
        "I am worthy of taking up space.",
        "My potential is limitless."
    ],
    
    // Thought Challenge Configuration
    THOUGHT_CHALLENGE: {
        CHALLENGES: [
            { 
                task: "“This is a gift to future me.”", 
                reward: "🎉 Quest Complete: Kindness to Future Self → +50 Compassion Points | Unlocked: Calmer Tomorrow Aura" 
            },
            { 
                task: "One-minute rule challenge", 
                reward: "⚡ Speed Run Achieved: Micro-Task Blitz → +20 Momentum | New Streak Counter Unlocked!" 
            },
            { 
                task: "“I’m allowed to do it imperfectly.”", 
                reward: "🌟 Achievement Unlocked: Good Enough Hero → +30 Self-Kindness | Badge: Imperfection Master" 
            },
            { 
                task: "Pair it with something you love", 
                reward: "🎧 Side Quest Complete: Pleasure Pairing → +40 Joy | Reward Track: Favorite Podcast Episode Buff" 
            },
            { 
                task: "The 5-second countdown", 
                reward: "🚀 Launch Sequence Success → +25 Action Energy | Ability Unlocked: Instant Start" 
            },
            { 
                task: "“Body first, mind follows.”", 
                reward: "🏃 Tutorial Complete: Motion Creates Emotion → +35 Willpower | New Gear: Momentum Boots" 
            },
            { 
                task: "Gratitude anchor", 
                reward: "✨ Daily Gratitude Logged → +50 Peace Points | Bonus: Warm Glow Status Effect (lasts all day)" 
            },
            { 
                task: "Environment as motivator", 
                reward: "🧹 Area Cleared: 5-Minute Tidy → +30 Clarity | Environment Buff: Focused Zone Activated" 
            },
            { 
                task: "“What would caring for myself look like right now?”", 
                reward: "❤️ Self-Care Choice Made → +60 Healing | Title Earned: Gentle Guardian" 
            },
            { 
                task: "Celebrate micro-progress", 
                reward: "🏆 Victory Pose Triggered → +20 Confidence | Combo Multiplier Active for Next Task" 
            },
            { 
                task: "The “two-minute extension” challenge", 
                reward: "⏱️ Over-Time Bonus Earned → +40 Flow State | Secret Achievement: Kept Going Anyway" 
            },
            { 
                task: "Imagine the relief", 
                reward: "😌 Future Relief Cashed In → +55 Satisfaction | Loot Drop: Peace of Mind Potion" 
            },
            { 
                task: "Make it social", 
                reward: "👥 Co-op Mode Activated → +45 Connection | Friend Buff: Shared Energy +20%" 
            },
            { 
                task: "One-task-at-a-time rule", 
                reward: "🎯 Focus Target Locked → +30 Discipline | Reward: Clear Quest Log (mental clutter removed)" 
            },
            { 
                task: "Sensory reward", 
                reward: "🌈 Sensory Upgrade Installed → +50 Enjoyment | Permanent Perk: Tasks Feel Better" 
            },
            { 
                task: "“I’m building trust with myself.”", 
                reward: "🤝 Trust Level Increased → +70 Self-Respect | New Stat: Reliability +10 (permanent)" 
            },
            { 
                task: "Reframe as therapy", 
                reward: "🧠 Therapy Session Complete → +60 Emotional XP | Skill Up: Mindful Action Level 2" 
            },
            { 
                task: "The “good enough” day", 
                reward: "☀️ Daily Objective Met: Progress > Perfection → +40 Resilience | Bonus: Rest Guilt Removed" 
            },
            { 
                task: "Connect it to a bigger why", 
                reward: "🌱 Growth Path Advanced → +80 Purpose | Milestone Reached: Future Self Closer" 
            },
            { 
                task: "End-of-day reflection", 
                reward: "🌙 Daily Review Complete → +100 Victory Points | End-of-Day Cutscene: Chain of Quiet Wins | Save Point Created" 
            }
        ],
        COMPLETION_MESSAGE: "You’re leveling up every single day—keep going, hero! 🎮🏆",
        QUEST_BANK: {
            'happy': [
                { task: "Write one thing you’re proud of today.", reward: "✨ Pride Boost: +50 Confidence | Unlocked: Radiant Aura" },
                { task: "Save one moment from today you’d like to relive.", reward: "📸 Memory Locked: +40 Joy | New Item: Golden Snapshot" },
                { task: "Identify one strength that helped you feel happy today.", reward: "🛡️ Strength Recognized: +30 Resilience | Ability: Inner Power" },
                { task: "List three things you’re grateful for right now.", reward: "🙏 Gratitude Multiplier: +60 Peace | Status: Blessed" },
                { task: "Choose one way to carry today’s joy into tomorrow.", reward: "🌱 Seed of Joy: +45 Momentum | Buff: Tomorrow's Glow" },
                { task: "Log one personal win from today.", reward: "🏆 Trophy Earned: +55 Achievement | Title: Daily Champion" },
                { task: "Acknowledge one person who added to your happiness.", reward: "🤝 Connection Link: +40 Harmony | Perk: Kind Soul" },
                { task: "Mark one habit that’s clearly working for you.", reward: "🔄 Habit Mastery: +50 Discipline | Streak: Consistency King" },
                { task: "Reflect on what this happiness teaches you about yourself.", reward: "🧠 Wisdom Gain: +65 Insight | New Skill: Self-Awareness" },
                { task: "Do one small act to celebrate yourself today.", reward: "🎉 Party of One: +70 Self-Love | Reward: Sparkle Effect" },
                { task: "Capture one positive thought that stood out today.", reward: "💡 Mind Light: +35 Clarity | Status: Focused" },
                { task: "Note one part of today that felt effortless.", reward: "🌊 Flow State: +50 Ease | Ability: Smooth Sailing" },
                { task: "Share or note one way to spread positivity.", reward: "📢 Echo Effect: +45 Influence | Buff: Positive Vibe" },
                { task: "Write one thing you’re doing right in life.", reward: "✅ Path Confirmed: +60 Certainty | Perk: Guided Spirit" },
                { task: "Reflect on why this happiness feels meaningful.", reward: "💎 Meaning Found: +75 Purpose | Milestone: Heart Centered" },
                { task: "Describe the version of yourself that showed up today.", reward: "🎭 Identity Found: +40 Authenticity | Title: True Self" },
                { task: "Write one line to your future self about today.", reward: "✉️ Time Capsule: +50 Connection | Item: Future Message" },
                { task: "Identify a belief about yourself that was reinforced.", reward: "⚓ Core Belief: +55 Stability | Status: Unshakeable" },
                { task: "Note what made today feel fulfilling.", reward: "🌟 Fullness: +65 Satisfaction | Buff: Contentment" },
                { task: "Check in with how happiness feels in your body.", reward: "🧘 Somatic Sync: +40 Presence | Status: Grounded" }
            ],
            'sad': [
                { task: "Identify one small thing that could help tomorrow.", reward: "🌤️ Hope Found: +40 Resilience | Status: Future Focused" },
                { task: "Write what you’d say to a friend feeling this way.", reward: "❤️ Compassion: +50 Empathy | Perk: Kind Voice" },
                { task: "Mark one thing in this situation you can control.", reward: "🎮 Agency Regained: +45 Power | Buff: Stable Ground" },
                { task: "Recall one strength that helped you through past hard days.", reward: "⚔️ Warrior Spirit: +55 Courage | Title: Survivor" },
                { task: "Name the emotion that needs attention right now.", reward: "🏷️ Labeled: +30 Clarity | Status: Processing" },
                { task: "Identify where you’re being too hard on yourself.", reward: "🛡️ Shield Up: +60 Self-Kindness | Ability: Gentle Guard" },
                { task: "Choose one gentle step forward today.", reward: "🐢 Steady Pace: +35 Momentum | Buff: Patient Growth" },
                { task: "Write what your heart needs right now.", reward: "💓 Heart Listen: +50 Healing | Status: In-Tune" },
                { task: "Recall one challenge you’ve already overcome.", reward: "🏅 History Lesson: +65 Strength | Perk: Battle Tested" },
                { task: "Let go of one thing you don’t need to carry today.", reward: "🎈 Weightless: +70 Relief | Status: Lightened" },
                { task: "Do one comforting action for yourself.", reward: "🧸 Comfort Zone: +40 Peace | Item: Cozy Shield" },
                { task: "Write one reason to keep going today.", reward: "⚓ Anchor Set: +75 Purpose | Status: Grounded" },
                { task: "Choose one form of rest you need.", reward: "💤 Recharge: +50 Energy | Buff: Restored" },
                { task: "Acknowledge one emotion you’ve been avoiding.", reward: "🚪 Door Opened: +45 Honesty | Status: Bravery" },
                { task: "Identify one support that could help right now.", reward: "🆘 Lifeline: +30 Connection | Status: Supported" },
                { task: "Write one truth you need to hear today.", reward: "📜 Truth Seeker: +55 Integrity | Buff: Clear Mind" },
                { task: "Remind yourself why this feeling isn’t permanent.", reward: "⏳ Time Heals: +40 Perspective | Status: Enduring" },
                { task: "Perform one small act of self-kindness.", reward: "✨ Spark: +60 Self-Worth | Buff: Gentle Soul" },
                { task: "Show compassion to one part of yourself.", reward: "🤝 Handshake: +65 Integration | Title: Self-Healer" },
                { task: "Take one step that begins healing.", reward: "🛤️ First Step: +70 Progress | Status: On the Mend" }
            ],
            'neutral': [
                { task: "Write one thing that feels unclear right now.", reward: "🌫️ Fog Clearing: +35 Clarity | Status: Aware" },
                { task: "Choose one thing you want more of this week.", reward: "🎯 Target Locked: +45 Focus | Buff: Intentional" },
                { task: "Identify one decision you’re postponing.", reward: "⚖️ Balance: +50 Decisiveness | Perk: Decision Maker" },
                { task: "Define what progress would look like today.", reward: "📏 Mapped Out: +40 Direction | Status: Navigating" },
                { task: "Pick one life area that needs attention.", reward: "🔍 Spotlight: +55 Awareness | Buff: Vigilant" },
                { task: "Note something you’re drifting away from.", reward: "🧭 Course Correct: +50 Realignment | Status: Guided" },
                { task: "Set one small goal for today.", reward: "🚩 Flag Planted: +30 Momentum | Buff: Goal Oriented" },
                { task: "Write down a recurring thought.", reward: "🔄 Pattern Found: +60 Insight | Perk: Pattern Breaker" },
                { task: "Identify one change you’re resisting.", reward: "🌊 Resistance Low: +45 Adaptability | Status: Flexible" },
                { task: "Note what your intuition suggests.", reward: "🔮 Inner Voice: +65 Trust | Title: Intuitive" },
                { task: "Decide what would make today feel purposeful.", reward: "💎 Value Found: +70 Purpose | Status: Driven" },
                { task: "Acknowledge something you’re avoiding.", reward: "🛡️ Brave Face: +55 Courage | Status: Confronting" },
                { task: "Choose the direction that feels most natural.", reward: "🌿 Natural Flow: +40 Ease | Buff: Aligned" },
                { task: "Write what clarity would bring you.", reward: "☀️ Vision: +60 Insight | Status: Far-Sighted" },
                { task: "Pick one choice aligned with your values.", reward: "⚖️ Integrity: +75 Honesty | Perk: Value Driven" },
                { task: "Select one thing worth focusing on today.", reward: "🎯 Focus Point: +35 Concentration | Status: Zeroed In" },
                { task: "Identify what you’re waiting for.", reward: "⏳ Wait Ended: +50 Action | Buff: Initiator" },
                { task: "Take one step to reduce confusion.", reward: "🧹 Tidy Mind: +45 Order | Status: Organized" },
                { task: "Identify what you need more information about.", reward: "📚 Scholar: +65 Knowledge | Status: Inquisitive" },
                { task: "Set one intention to guide today.", reward: "🕯️ Lit Path: +70 Willpower | Title: Intentional Leader" }
            ],
            'stressed': [
                { task: "Identify the main source of stress right now.", reward: "🎯 Target ID: +40 Clarity | Status: Analytical" },
                { task: "Pause or postpone one non-urgent task.", reward: "🛑 Space Made: +55 Peace | Buff: Time Wealthy" },
                { task: "Mark one thing that isn’t urgent.", reward: "📉 Pressure Drop: +45 Calm | Status: Simplified" },
                { task: "Take one action to slow down in the next hour.", reward: "🐌 Slow Mo: +50 Presence | Perk: Time Bender" },
                { task: "Release one thing you don’t need today.", reward: "🎈 Weight Off: +60 Relief | Status: Lighter" },
                { task: "Check what your body needs right now.", reward: "🧘 Somatic Care: +35 Balance | Status: Nurtured" },
                { task: "Identify one expectation causing pressure.", reward: "💎 Unmasked: +65 Truth | Buff: Free Spirit" },
                { task: "Define what calm would look like right now.", reward: "🌊 Still Water: +50 Serenity | Title: Calm Master" },
                { task: "Let go of one thing you’re trying to control.", reward: "🕊️ Release: +70 Freedom | Status: Flowing" },
                { task: "Move one task to tomorrow.", reward: "📅 Deferred: +40 Relief | Buff: Boundary Builder" },
                { task: "Do one grounding action.", reward: "⚓ Anchored: +55 Stability | Status: Unshakeable" },
                { task: "Strengthen one personal boundary.", reward: "🛡️ Wall Built: +65 Protection | Perk: Safe Space" },
                { task: "Take a short intentional break.", reward: "⏸️ Intermission: +30 Energy | Status: Paused" },
                { task: "Drop one stress you don’t need to carry.", reward: "🗑️ Discarded: +45 Lightness | Buff: Efficient" },
                { task: "Simplify one part of today.", reward: "🕯️ Minimalist: +50 Focus | Status: Essential" },
                { task: "Identify one stressful thought.", reward: "🔍 Caught: +60 Awareness | Title: Mind Guard" },
                { task: "Practice slowing down for one minute.", reward: "🐢 Zen Mode: +40 Patience | Status: Calm" },
                { task: "Reach out or note one support option.", reward: "🤝 Allied: +75 Security | Status: Connected" },
                { task: "Take three deep breaths.", reward: "🌬️ Airflow: +65 Vitality | Buff: Oxygenated" },
                { task: "Visualize what peace feels like for you.", reward: "🌈 Visionary: +70 Peace | Status: Dreamer" }
            ],
            'tired': [
                { task: "Identify what drained your energy today.", reward: "🔍 Leak Found: +40 Insight | Status: Observant" },
                { task: "Choose the type of rest you need most.", reward: "💤 Custom Rest: +55 Recovery | Buff: Targeted Sleep" },
                { task: "Stop doing one unnecessary task temporarily.", reward: "🚫 Hard Stop: +45 Peace | Status: Protected" },
                { task: "Plan one way to conserve energy tomorrow.", reward: "🔋 Battery Save: +50 Foresight | Perk: Planner" },
                { task: "Check what your body is asking for.", reward: "👂 Deep Listen: +35 Presence | Status: Attuned" },
                { task: "Delay one non-essential obligation.", reward: "⏳ Not Now: +60 Freedom | Buff: Priority King" },
                { task: "Do one action that helps you recharge.", reward: "⚡ Charging: +70 Vitality | Status: Powered Up" },
                { task: "Decide what “enough” means today.", reward: "🛑 Enough: +50 Contentment | Title: Satisfied" },
                { task: "Slow your pace for one activity.", reward: "🐌 Mindful Motion: +40 Ease | Status: Graceful" },
                { task: "Simplify your evening routine.", reward: "🌙 Soft Landing: +65 Sleep | Buff: Night Owl" },
                { task: "Identify what kind of tired you feel.", reward: "🏷️ Defined: +45 Knowledge | Status: Aware" },
                { task: "Take a short rest right now.", reward: "⏸️ Quick Nap: +30 Energy | Status: Resting" },
                { task: "Release one expectation.", reward: "🎈 Floating: +55 Relief | Buff: Chill Mode" },
                { task: "Reflect on how rest would help you.", reward: "🧠 Rest Logic: +60 Wisdom | Status: Wise" },
                { task: "Notice one signal your body is sending.", reward: "📡 Signal: +50 Sensitivity | Status: Responsive" },
                { task: "Do one thing that supports better sleep.", reward: "🛌 Sleep Prep: +75 Health | Perk: Restful Sleeper" },
                { task: "Plan tomorrow with more ease.", reward: "🗓️ Easy Day: +40 Peace | Status: Prepared" },
                { task: "Reduce one energy drain.", reward: "✂️ Cut Off: +65 Efficiency | Buff: Power Saver" },
                { task: "Practice one act of self-care.", reward: "✨ Self-Nurture: +70 Love | Status: Caring" },
                { task: "Honor one personal limit today.", reward: "🛡️ Boundary: +75 Respect | Title: Self-Protector" }
            ]
        }
    },
    
    // Vent Room Configuration
    VENT: {
        MAX_MESSAGES: 50,
        MESSAGE_LIMIT: 500,
        ANONYMITY: true
    },
    
    // Indian Crisis Helplines
    INDIAN_HOTLINES: [
        {
            name: "Kiran Mental Health Helpline",
            description: "Ministry of Social Justice & Empowerment",
            number: "1800-599-0019",
            type: "toll-free",
            hours: "24/7",
            languages: "Multilingual"
        },
        {
            name: "Vandrevala Foundation",
            description: "Mental health & suicide prevention",
            numbers: ["9999 666 555", "915 298 7821"],
            type: "phone",
            hours: "24/7",
            features: ["WhatsApp available", "Professional counselors"]
        },
        {
            name: "iCall Psychosocial Helpline",
            description: "Tata Institute of Social Sciences",
            number: "915 298 7821",
            type: "phone",
            hours: "Mon-Sat 10AM-8PM",
            email: "icall@tiss.edu"
        },
        {
            name: "Police & Emergency",
            description: "Immediate life-threatening situations",
            numbers: ["100", "112"],
            type: "emergency",
            hours: "24/7"
        }
    ],
    
    // Local Storage Keys
    STORAGE_KEYS: {
        AURI_HISTORY: "auri_history",
        JOURNAL_ENTRIES: "journal_entries",
        VENT_MESSAGES: "vent_messages",
        USER_PROFILE: "user_profile",
        LOGGED_IN: "melo_logged_in",
        USER_ID: "melo_user_id",
        USER_EMAIL: "melo_user_email"
    },
    
    // Error Messages
    ERRORS: {
        NETWORK: "Network error. Please check your connection.",
        OFFLINE: "You're offline. Some features may be limited.",
        SAVE_FAILED: "Failed to save. Trying locally...",
        LOAD_FAILED: "Failed to load data."
    }
};

window.CONFIG = CONFIG;