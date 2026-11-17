// ===== API Service Layer for Melo App =====

class ApiService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.cache = new Map();
    }
    
    // ===== Gemini API Methods =====
    async generateAuriResponse(prompt) {
        if (typeof CONFIG === 'undefined' || !CONFIG.API_KEY || !CONFIG.GEMINI_MODEL) {
            console.error('API configuration is missing!');
            return "I'm having trouble with my settings. Please make sure the API key is configured correctly in config.js! ⚙️";
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.API_KEY}`;

        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        };

        try {
            console.log('Making API call to:', apiUrl.split('?')[0]);
            const jsonResponse = await this.fetchWithRetry(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Success! JSON response:', jsonResponse);

            const candidate = jsonResponse.candidates?.[0];
            let responseText = "Sorry, I'm having trouble connecting. Maybe try a quick breathing exercise? 🧘‍♀️";
            
            if (candidate && candidate.content?.parts?.[0]?.text) {
                responseText = candidate.content.parts[0].text;
            }
            
            return responseText;
            
        } catch (error) {
            console.error("Gemini API Error:", error);
            
            // Expanded fallback responses for common therapy topics
            const lowerPrompt = prompt.toLowerCase();
            
            // Greetings
            if (lowerPrompt.includes('hi') || lowerPrompt.includes('hello') || lowerPrompt.includes('hey')) {
                return "Hello! I'm here to listen and support you. What's on your mind today? 🤗";
            }
            // About time
            if (lowerPrompt.includes('time') || lowerPrompt.includes('what time')) {
                return `It's ${new Date().toLocaleTimeString()} right now. How are you feeling at this moment? 😊`;
            }
            // How are you
            if (lowerPrompt.includes('how are you')) {
                return "I'm doing well, thank you for asking! I'm here to help you. How about you? 💙";
            }
            // Anxiety
            if (lowerPrompt.includes('anxious') || lowerPrompt.includes('anxiety') || lowerPrompt.includes('nervous')) {
                return "I'm sorry you're feeling anxious. Try the 4-4-6 breathing technique: Inhale 4s, hold 4s, exhale 6s. Our Toolkit has guided exercises! 🧘‍♀️";
            }
            // Depression/Sadness
            if (lowerPrompt.includes('lonely')) {
                return "I hear you, and it's okay to feel this way. You're not alone. Would you like to journal or try a Grounding exercise? 💙";
            }
            // Stress
            if (lowerPrompt.includes('stress') || lowerPrompt.includes('stressed') || lowerPrompt.includes('overwhelmed')) {
                return "It sounds like you're carrying a lot right now. Try taking breaks, deep breathing, or breaking tasks into smaller steps. 🌿";
            }
            // Sleep
            if (lowerPrompt.includes('sleep') || lowerPrompt.includes('insomnia') || lowerPrompt.includes('tired')) {
                return "Sleep and mental health are connected. Try consistent sleep schedule, limiting screens before bed, avoiding caffeine after 2pm. 🌙";
            }
            // Self-esteem
            if (lowerPrompt.includes('self esteem') || lowerPrompt.includes('not good enough') || lowerPrompt.includes('confidence')) {
                return "You are worthy exactly as you are now! Try challenging negative self-talk and celebrating small wins. You're stronger than you know! 💪";
            }
            // Relationships
            if (lowerPrompt.includes('relationship') || lowerPrompt.includes('friendship') || lowerPrompt.includes('family')) {
                return "Relationships can be complicated and have big impact on mental health. It's okay to set boundaries or take space. What matters most is how you treat yourself. 💙";
            }
            // Anger
            if (lowerPrompt.includes('angry') || lowerPrompt.includes('anger') || lowerPrompt.includes('frustrated')) {
                return "Anger is natural but can be overwhelming. Try deep breaths, counting to 10, exercise, or journaling. What matters is how we respond. 🧘‍♂️";
            }
            // Mindfulness
            if (lowerPrompt.includes('mindfulness') || lowerPrompt.includes('meditation') || lowerPrompt.includes('meditate')) {
                return "Mindfulness is about being present without judgment. Start small: focus on breath for 2 minutes, or try our guided breathing exercises! 🧘‍♀️";
            }
            // Self-care
            if (lowerPrompt.includes('self care') || lowerPrompt.includes('self-care')) {
                return "Self-care nourishes your mental, emotional, physical well-being! This could be: bath, reading, walking, calling a friend, or saying no to drains. 🌸";
            }
            // Crisis - Suicidal thoughts
            if (lowerPrompt.includes('suicidal') || lowerPrompt.includes('want to die') || lowerPrompt.includes('kill myself')) {
                return "I'm really concerned about you. Please reach out: iCall 9152987821, Kiran Helpline 1800-599-0019. You matter. Please talk to someone now. 💙";
            }
            // About Melo
            if (lowerPrompt.includes('what is melo') || lowerPrompt.includes('about melo')) {
                return "Melo is an AI-powered mental wellness platform for Gen Z. We provide journaling, toolkit exercises, anonymous venting, and AI chat support. 🧠✨";
            }
            // Who are you
            if (lowerPrompt.includes('who are you') || lowerPrompt.includes('what are you')) {
                return "I'm Auri, your personal mental wellness assistant! I'm here to listen, support you, and help you find the right tools to feel better. 🤝";
            }
            // Thanks
            if (lowerPrompt.includes('thank') || lowerPrompt.includes('thanks')) {
                return "You're very welcome! I'm always here for you. Remember, you're doing great. 🌟";
            }
            // Default fallback
            return "I'm here for you! While I'm connecting properly, remember you're not alone. Journal thoughts, try breathing, or explore our Toolkit? 📝🧘‍♀️";
        }
    }
    
    // ===== Fetch with Retry (fast + timeout) =====
    async fetchWithRetry(url, options, retries = 1) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Attempt ${i + 1}: Fetching ${url}`);

                const controller = new AbortController();
                const timeoutMs = (typeof CONFIG !== 'undefined' && CONFIG.API_TIMEOUT) ? CONFIG.API_TIMEOUT : 10000;
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const response = await fetch(url, { ...options, mode: 'cors', signal: controller.signal });
                clearTimeout(timeoutId);

                console.log(`Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
                    
                    // Don't retry on client errors that won't change (like 400 or 403)
                    if (response.status >= 400 && response.status < 500) {
                        throw new Error(`Client error: ${response.status} - ${errorText}`);
                    }
                    
                    throw new Error(`HTTP error! status: ${response.status}, Body: ${errorText}`);
                }
                
                const jsonResponse = await response.json();
                console.log('Success! JSON response:', jsonResponse);
                return jsonResponse;
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`Request timed out after ${CONFIG.API_TIMEOUT || 10000}ms`);
                }
                console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
                if (i === retries - 1) throw error;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    // ===== Network Status =====
    handleOnline() {
        this.isOnline = true;
        console.log('App is back online');
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('network-online'));
    }
    
    handleOffline() {
        this.isOnline = false;
        console.log('App is offline');
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('network-offline'));
    }
}

// Create singleton instance
const api = new ApiService();
window.api = api;
