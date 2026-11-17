const IS_STATIC_HOST = window.location.hostname.endsWith('vercel.app');

const DatabaseUtils = {
    // Base API URL (unused on static host)
    API_BASE: window.location.origin,

    // Generic API request helper
    async apiRequest(endpoint, options = {}) {
        if (IS_STATIC_HOST) {
            // On purely static hosting (like Vercel without the Node server),
            // skip network calls and let callers fall back to local data.
            throw new Error('API_DISABLED_ON_STATIC_HOST');
        }

        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    },

    // User operations
    async getUser(userId) {
        try {
            const response = await this.apiRequest(`/api/user/${userId}`);
            return response.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    async updateUser(userId, userData) {
        try {
            const response = await this.apiRequest(`/api/user/${userId}`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            return response.user;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Journal operations
    async saveJournalEntry(userId, entryData) {
        try {
            const response = await this.apiRequest('/api/journal', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    ...entryData
                })
            });
            return response.entry;
        } catch (error) {
            console.error('Error saving journal entry:', error);
            throw error;
        }
    },

    async getJournalEntries(userId) {
        try {
            const response = await this.apiRequest(`/api/journal/${userId}`);
            return response.entries || [];
        } catch (error) {
            console.error('Error getting journal entries:', error);
            return [];
        }
    },

    async deleteJournalEntry(userId, entryId) {
        try {
            await this.apiRequest(`/api/journal/${userId}/${entryId}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            throw error;
        }
    },

    // Auri chat operations
    async saveAuriMessage(userId, messageData) {
        try {
            const response = await this.apiRequest('/api/auri', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    ...messageData
                })
            });
            return response.message;
        } catch (error) {
            console.error('Error saving Auri message:', error);
            throw error;
        }
    },

    async getAuriHistory(userId) {
        try {
            const response = await this.apiRequest(`/api/auri/${userId}`);
            return response.messages || [];
        } catch (error) {
            console.error('Error getting Auri history:', error);
            return [];
        }
    },

    // Vent operations
    async getVentHistory() {
        try {
            const response = await this.apiRequest('/api/vent/history');
            return response.messages || [];
        } catch (error) {
            console.error('Error getting vent history:', error);
            return [];
        }
    }
};

// Legacy Firebase compatibility (for backward compatibility)
const FirebaseUtils = {
    isInitialized() {
        return true; // Always available since we're using HTTP API
    },

    isReady() {
        return true;
    },

    getFirebaseImports() {
        return {}; // Return empty object for compatibility
    },

    getDb() {
        return {}; // Return empty object for compatibility
    },

    getUserId() {
        return window.uniqueUserId || 'anonymous';
    },

    async executeWithFallback(operation, fallbackOperation) {
        try {
            return await operation();
        } catch (error) {
            console.warn('Primary operation failed, using fallback:', error);
            try {
                return await fallbackOperation();
            } catch (fallbackError) {
                console.error('Fallback operation also failed:', fallbackError);
                throw fallbackError;
            }
        }
    },

    logStatus() {
        console.log('Database Status:', {
            initialized: this.isInitialized(),
            mode: 'MONGODB_API'
        });
    }
};

window.FirebaseUtils = FirebaseUtils;
window.DatabaseUtils = DatabaseUtils;
