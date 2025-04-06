/**
 * Configuration file for Notary Voice Agent frontend
 * This file contains the API endpoints and other configuration variables
 */

const CONFIG = {
    // API base URL - change this to your actual backend API URL in production
    // This should point to your deployed Flask backend
    API_BASE_URL: 'https://notary-voice-agent-backend.herokuapp.com/api',
    
    // Local development URL - uncomment this for local testing
    // API_BASE_URL: 'http://localhost:5000/api',
    
    // Authentication settings
    AUTH: {
        TOKEN_KEY: 'notary_voice_auth_token',
        REFRESH_TOKEN_KEY: 'notary_voice_refresh_token',
        USER_INFO_KEY: 'notary_voice_user_info'
    },
    
    // Supported call features
    CALL_FEATURES: {
        RECORDING: true,
        TRANSCRIPTION: true,
        SUMMARY: true,
        TEXT_TO_SPEECH: true
    },
    
    // Default pagination settings
    PAGINATION: {
        ITEMS_PER_PAGE: 10,
        MAX_PAGES_DISPLAYED: 5
    },
    
    // Default theme settings (light/dark mode)
    THEME: {
        DEFAULT: 'light',
        STORAGE_KEY: 'notary_voice_theme'
    }
};

// Add a helper method to get the full API URL for a given endpoint
CONFIG.getApiUrl = function(endpoint) {
    return `${this.API_BASE_URL}/${endpoint.replace(/^\/+/, '')}`;
};

// Expose configuration globally
window.NOTARY_CONFIG = CONFIG; 