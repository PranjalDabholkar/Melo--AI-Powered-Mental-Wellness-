const GmailNotifications = {
    botName: 'Auri',
    
    templates: {
        welcome: (userName) => ({
            subject: `Welcome to Melo, ${userName}! 🌟`,
            body: `
Hi ${userName || 'there'},

I'm **${GmailNotifications.botName}**, your personal mental wellness companion. 

Thank you so much for logging in with Gmail! I'm here to support you on your journey toward better mental health. Whether you need someone to talk to, a place to journal, or just a moment of peace, I've got your back.

We're so glad to have you in our community!

Warmly,
${GmailNotifications.botName} 💙
            `
        }),

        features: (userName) => ({
            subject: 'How to make the most of Melo 🛠️',
            body: `
Hello ${userName || 'friend'},

**${GmailNotifications.botName}** here again! I wanted to show you some of the features that make Melo special:

1. **AI Wellness Chat**: You can talk to me anytime about how you're feeling. I'm here to listen without judgment.
2. **Mood Journaling**: Keep track of your thoughts and see how your mood changes over time.
3. **The Vent Room**: Share your thoughts anonymously with our supportive community.
4. **Mindfulness Tools**: Try our breathing exercises and grounding techniques when you feel overwhelmed.

To get started, just head over to your dashboard and say hello!

Best,
${GmailNotifications.botName}
            `
        }),

        emergency: (userName) => ({
            subject: 'Important: Emergency Resources 🆘',
            body: `
Hi ${userName || 'there'},

Your safety is our top priority. I'm **${GmailNotifications.botName}**, and I want to make sure you know where to turn if you ever feel like you're in immediate distress.

Melo provides a dedicated **Emergency Resources** section where you can find:
- 24/7 Crisis Hotlines
- Text-based support services
- Local mental health resources
- Grounding techniques for immediate relief

You can access these at any time by clicking the "SOS" or "Emergency" button in the app.

Please remember: You are never alone, and help is always available.

Take care,
${GmailNotifications.botName}
            `
        })
    },

    async sendNotification(type, email, userName) {
        try {
            if (!this.templates[type]) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            const template = this.templates[type](userName);
            
            // In a real application, this would call a backend API or an email service
            // For now, we'll simulate the sending and log it to the console
            console.log(`[${this.botName}] Sending ${type} email to ${email}...`);
            
            const notificationData = {
                from: `${this.botName} <notifications@meloapp.com>`,
                to: email,
                subject: template.subject,
                body: template.body,
                timestamp: new Date().toISOString()
            };

            // If EmailService is available, we could use it:
            if (typeof EmailService !== 'undefined' && EmailService.simulateSendEmail) {
                 await EmailService.simulateSendEmail(type === 'welcome' ? 'welcome' : 'updates', email, userName);
            }

            this.logNotification(notificationData);
            this.showVisualToast(type);

            return {
                success: true,
                message: `${type} notification sent successfully`,
                data: notificationData
            };
        } catch (error) {
            console.error(`[${this.botName}] Error sending notification:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    showVisualToast(type) {
        // Create a visual toast to show the user that an email was "sent"
        const toast = document.createElement('div');
        toast.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] bg-purple-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce';
        
        let icon = 'mail';
        let title = 'Email Sent';
        
        if (type === 'welcome') title = 'Welcome Email Sent! 📧';
        if (type === 'features') title = 'Features Guide Sent! 🛠️';
        if (type === 'emergency') title = 'Safety Resources Sent! 🆘';

        toast.innerHTML = `
            <div class="p-1 bg-white/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
            <span class="font-bold text-sm">${title}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('animate-bounce');
            toast.classList.add('transition-opacity', 'duration-500', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    logNotification(data) {
        console.log(`
┌──────────────────────────────────────────────────────────┐
│                GMAIL AUTOMATED RESPONSE                  │
├──────────────────────────────────────────────────────────┤
│ FROM:    ${data.from.padEnd(48)}│
│ TO:      ${data.to.padEnd(48)}│
│ SUBJECT: ${data.subject.padEnd(48)}│
├──────────────────────────────────────────────────────────┤
${data.body.split('\n').map(line => `│ ${line.padEnd(56)} │`).join('\n')}
└──────────────────────────────────────────────────────────┘
        `);
    },

    async triggerLoginSequence(email, userName) {
        console.log(`[${this.botName}] Initiating automated response sequence for ${email}`);
        
        // Store user info for the sequence
        localStorage.setItem('auri_notification_email', email);
        localStorage.setItem('auri_notification_user', userName);
        localStorage.setItem('auri_notification_step', '0');

        // Send the first one immediately
        await this.sendNotification('welcome', email, userName);
        localStorage.setItem('auri_notification_step', '1');
        
        // The remaining steps will be handled by the resumeSequence method
        // which should be called when the main app loads.
    },

    async resumeSequence() {
        const email = localStorage.getItem('auri_notification_email');
        const userName = localStorage.getItem('auri_notification_user');
        const step = localStorage.getItem('auri_notification_step');

        if (!email || !step) return;

        if (step === '1') {
            console.log(`[${this.botName}] Resuming sequence: Step 2 (Features)`);
            setTimeout(async () => {
                await this.sendNotification('features', email, userName);
                localStorage.setItem('auri_notification_step', '2');
                this.resumeSequence(); // Check for next step
            }, 5000);
        } else if (step === '2') {
            console.log(`[${this.botName}] Resuming sequence: Step 3 (Emergency)`);
            setTimeout(async () => {
                await this.sendNotification('emergency', email, userName);
                localStorage.removeItem('auri_notification_email');
                localStorage.removeItem('auri_notification_user');
                localStorage.removeItem('auri_notification_step');
            }, 10000);
        }
    }
};

// Auto-resume if in browser
if (typeof window !== 'undefined') {
    window.GmailNotifications = GmailNotifications;
    // Wait for other services to initialize
    setTimeout(() => {
        GmailNotifications.resumeSequence();
    }, 2000);
}
