/**
 * Authentication module for Notary Voice Agent frontend
 * Handles login, logout, and token management
 */

const Auth = {
    // Store token in local storage
    setToken: function(token) {
        localStorage.setItem(CONFIG.AUTH.TOKEN_KEY, token);
    },
    
    // Get token from local storage
    getToken: function() {
        return localStorage.getItem(CONFIG.AUTH.TOKEN_KEY);
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        return !!this.getToken();
    },
    
    // Store user info in local storage
    setUserInfo: function(userInfo) {
        localStorage.setItem(CONFIG.AUTH.USER_INFO_KEY, JSON.stringify(userInfo));
    },
    
    // Get user info from local storage
    getUserInfo: function() {
        const userInfo = localStorage.getItem(CONFIG.AUTH.USER_INFO_KEY);
        return userInfo ? JSON.parse(userInfo) : null;
    },
    
    // Login function
    login: async function(username, password) {
        try {
            const response = await fetch(CONFIG.getApiUrl('auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }
            
            const data = await response.json();
            this.setToken(data.token);
            this.setUserInfo(data.user);
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    // Logout function
    logout: function() {
        localStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
        localStorage.removeItem(CONFIG.AUTH.USER_INFO_KEY);
        // Redirect to login page
        window.location.href = 'login.html';
    },
    
    // Add authorization header to fetch requests
    authHeader: function() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },
    
    // Check if token is expired and redirect to login if needed
    checkAuthAndRedirect: function() {
        if (!this.isAuthenticated() && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

// Initialize auth check when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Don't redirect if already on login page
    if (!window.location.pathname.includes('login.html')) {
        Auth.checkAuthAndRedirect();
    }
    
    // Add logout button event listener if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logout();
        });
    }
});

// Expose Auth globally
window.Auth = Auth; 