/**
 * Melo Login & Onboarding Service
 */

const LoginPage = {
    /**
     * Handle logout/exit
     */
    logout: async function() {
        // Clear Melo auth/session markers
        try {
            if (window.CONFIG?.STORAGE_KEYS) {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.LOGGED_IN);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_EMAIL);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ID);
            }
            localStorage.removeItem('melo_logged_in');
        } catch (e) {
            // ignore
        }

        // Clear server session cookie
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            // ignore and still redirect
        }

        window.location.href = 'login.html';
    }
};

// Export to window object
window.LoginPage = LoginPage;
