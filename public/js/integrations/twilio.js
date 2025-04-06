/**
 * Twilio Integration for Notary Voice Agent
 * Provides real-time voice calling and SMS functionality
 */

const TwilioIntegration = (function() {
    // Configuration
    const config = {
        tokenEndpoint: '/twilio/token', // Backend endpoint to get Twilio access token
        callEndpoint: '/twilio/call',  // Backend endpoint to initiate outbound calls
        recordingEndpoint: '/twilio/recording', // Endpoint for call recordings
        transcriptionEndpoint: '/twilio/transcription', // Endpoint for transcriptions
        smsEndpoint: '/twilio/sms' // Endpoint for sending SMS
    };

    // Private variables
    let twilioDevice = null;
    let activeConnection = null;
    let callDuration = 0;
    let callDurationTimer = null;
    let accessToken = null;
    let tokenRefreshTimeout = null;
    let listeners = [];
    let isInitialized = false;
    let callHistory = [];
    let smsHistory = [];
    
    // Load call and SMS history from local storage
    function loadHistories() {
        try {
            const savedCallHistory = localStorage.getItem('twilioCallHistory');
            if (savedCallHistory) {
                callHistory = JSON.parse(savedCallHistory);
            }
            
            const savedSmsHistory = localStorage.getItem('twilioSmsHistory');
            if (savedSmsHistory) {
                smsHistory = JSON.parse(savedSmsHistory);
            }
        } catch (error) {
            console.error('Error loading Twilio histories:', error);
        }
    }
    
    // Save call and SMS history to local storage
    function saveHistories() {
        try {
            localStorage.setItem('twilioCallHistory', JSON.stringify(callHistory));
            localStorage.setItem('twilioSmsHistory', JSON.stringify(smsHistory));
        } catch (error) {
            console.error('Error saving Twilio histories:', error);
        }
    }

    // Initialize the Twilio device
    function initDevice(token) {
        accessToken = token;
        
        // Check if the Twilio SDK is available
        if (typeof Twilio === 'undefined' || typeof Twilio.Device === 'undefined') {
            notifyListeners('error', { message: 'Twilio SDK not loaded. Please check your internet connection and refresh the page.' });
            console.error('Twilio SDK not loaded');
            
            // Fall back to mock implementation for development
            useMockImplementation();
            return;
        }
        
        try {
            // If there's an existing device, destroy it first
            if (twilioDevice) {
                twilioDevice.destroy();
            }
            
            // Create a new device with the token
            twilioDevice = new Twilio.Device(token, {
                codecPreferences: ['opus', 'pcmu'],
                fakeLocalDTMF: true,
                enableRingingState: true
            });
            
            // Set up event handlers
            setupDeviceEventHandlers();
            
            // Schedule token refresh (tokens typically expire after 1 hour)
            scheduleTokenRefresh();
            
            notifyListeners('deviceReady', { device: twilioDevice });
            isInitialized = true;
            
            console.log('Twilio device initialized successfully');
        } catch (error) {
            console.error('Error initializing Twilio device:', error);
            notifyListeners('error', { message: 'Failed to initialize Twilio device: ' + error.message });
            
            // Fall back to mock implementation for development
            useMockImplementation();
        }
    }
    
    // Set up event handlers for the Twilio device
    function setupDeviceEventHandlers() {
        if (!twilioDevice) return;
        
        twilioDevice.on('registered', function() {
            notifyListeners('registered');
        });
        
        twilioDevice.on('error', function(error) {
            console.error('Twilio device error:', error);
            notifyListeners('error', { message: error.message || 'Unknown Twilio error' });
        });
        
        twilioDevice.on('incoming', function(connection) {
            activeConnection = connection;
            notifyListeners('incoming', { 
                from: connection.parameters.From,
                callSid: connection.parameters.CallSid 
            });
            
            setupConnectionEventHandlers(connection);
        });
        
        twilioDevice.on('cancel', function() {
            notifyListeners('cancelled');
            resetCallState();
        });
        
        twilioDevice.on('connect', function(connection) {
            console.log('Twilio device connected');
        });
        
        twilioDevice.on('disconnect', function() {
            console.log('Twilio device disconnected');
        });
    }
    
    // Set up event handlers for the active connection
    function setupConnectionEventHandlers(connection) {
        if (!connection) return;
        
        connection.on('accept', function() {
            notifyListeners('connected', { 
                callSid: connection.parameters.CallSid,
                direction: connection.parameters.Direction,
                from: connection.parameters.From,
                to: connection.parameters.To
            });
            startCallDurationTimer();
        });
        
        connection.on('disconnect', function() {
            notifyListeners('disconnected', { 
                callSid: connection.parameters.CallSid,
                duration: callDuration 
            });
            resetCallState();
        });
        
        connection.on('error', function(error) {
            console.error('Connection error:', error);
            notifyListeners('error', { message: error.message || 'Call connection error' });
        });
        
        connection.on('mute', function(isMuted) {
            notifyListeners('mute', { isMuted: isMuted });
        });
        
        connection.on('volume', function(inputVolume, outputVolume) {
            // You can use this for UI volume indicators if needed
        });
    }
    
    // Start the call duration timer
    function startCallDurationTimer() {
        callDuration = 0;
        clearInterval(callDurationTimer);
        callDurationTimer = setInterval(function() {
            callDuration += 1;
            notifyListeners('callDuration', { seconds: callDuration });
        }, 1000);
    }
    
    // Reset the call state when a call ends
    function resetCallState() {
        clearInterval(callDurationTimer);
        callDurationTimer = null;
        activeConnection = null;
    }
    
    // Get an access token from the backend
    function getAccessToken() {
        // For development/demo, use a mock token
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Using mock token for local development');
            useMockImplementation();
            return Promise.resolve();
        }
        
        return fetch(config.tokenEndpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to get Twilio access token');
                }
                return response.json();
            })
            .then(data => {
                initDevice(data.token);
            })
            .catch(error => {
                console.error('Error getting access token:', error);
                notifyListeners('error', { message: 'Failed to get access token: ' + error.message });
                
                // Fall back to mock implementation for development
                useMockImplementation();
            });
    }
    
    // Schedule a token refresh before the current token expires
    function scheduleTokenRefresh() {
        // Clear any existing timeout
        if (tokenRefreshTimeout) {
            clearTimeout(tokenRefreshTimeout);
        }
        
        // Tokens typically expire after 1 hour, so refresh after 50 minutes
        const refreshTime = 50 * 60 * 1000;
        tokenRefreshTimeout = setTimeout(getAccessToken, refreshTime);
    }
    
    // Format a phone number to E.164 format
    function formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        
        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Check if the number already has a country code (assumed to be +1 for US)
        if (phoneNumber.startsWith('+')) {
            return '+' + cleaned;
        }
        
        // Add +1 for US numbers if the number has 10 digits
        if (cleaned.length === 10) {
            return '+1' + cleaned;
        }
        
        // If the number starts with 1 and has 11 digits, assume it's a US number
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return '+' + cleaned;
        }
        
        // Otherwise, just return with a plus sign
        return '+' + cleaned;
    }
    
    // Fall back to mock implementation for development or when Twilio is unavailable
    function useMockImplementation() {
        console.log('Using mock Twilio implementation');
        isInitialized = true;
        notifyListeners('deviceReady', { mock: true });
    }
    
    // Mock connection for local development/testing
    function mockConnectCall(params) {
        if (!params || !params.To) {
            notifyListeners('error', { message: 'Phone number is required' });
            return null;
        }
        
        const formattedNumber = formatPhoneNumber(params.To);
        if (!formattedNumber) {
            notifyListeners('error', { message: 'Invalid phone number' });
            return null;
        }
        
        const mockConnection = {
            parameters: {
                CallSid: 'MC' + Date.now(),
                Direction: 'outbound',
                From: '+15555555555', // Mock "from" number
                To: formattedNumber
            },
            on: function(event, callback) {
                // Store the callbacks for triggering later
                if (event === 'accept') {
                    setTimeout(() => {
                        callback();
                        console.log(`[MOCK] Call connected to ${formattedNumber}`);
                    }, 1000);
                }
            },
            mute: function(bool) {
                console.log(`[MOCK] Call ${bool ? 'muted' : 'unmuted'}`);
                return this;
            },
            disconnect: function() {
                setTimeout(() => {
                    notifyListeners('disconnected', { 
                        callSid: this.parameters.CallSid, 
                        duration: callDuration 
                    });
                    resetCallState();
                    console.log('[MOCK] Call disconnected');
                }, 500);
                return this;
            }
        };
        
        activeConnection = mockConnection;
        
        // Simulate connection setup
        setTimeout(() => {
            notifyListeners('connected', {
                callSid: mockConnection.parameters.CallSid,
                direction: mockConnection.parameters.Direction,
                from: mockConnection.parameters.From,
                to: mockConnection.parameters.To
            });
            startCallDurationTimer();
        }, 1000);
        
        return mockConnection;
    }
    
    // Notify all registered listeners of events
    function notifyListeners(event, data = {}) {
        listeners.forEach(listener => {
            try {
                listener('twilio', { event: event, data: data });
            } catch (error) {
                console.error('Error notifying Twilio listener:', error);
            }
        });
    }
    
    // Add a call to the history
    function addCallToHistory(callData) {
        const call = {
            id: 'call_' + Date.now(),
            timestamp: new Date().toISOString(),
            ...callData
        };
        
        callHistory.unshift(call);
        
        // Limit history to 100 entries
        if (callHistory.length > 100) {
            callHistory = callHistory.slice(0, 100);
        }
        
        saveHistories();
        return call;
    }
    
    // Add an SMS to the history
    function addSmsToHistory(smsData) {
        const sms = {
            id: 'sms_' + Date.now(),
            timestamp: new Date().toISOString(),
            ...smsData
        };
        
        smsHistory.unshift(sms);
        
        // Limit history to 100 entries
        if (smsHistory.length > 100) {
            smsHistory = smsHistory.slice(0, 100);
        }
        
        saveHistories();
        return sms;
    }

    // Public API
    return {
        // Initialize the Twilio integration
        init: function() {
            if (isInitialized) return Promise.resolve();
            
            // Load histories from local storage
            loadHistories();
            
            // Get access token and initialize device
            return getAccessToken();
        },
        
        // Register a listener for Twilio events
        addListener: function(callback) {
            if (typeof callback === 'function') {
                listeners.push(callback);
            }
        },
        
        // Remove a listener
        removeListener: function(callback) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        },
        
        // Start a call to the specified phone number
        startCall: function(phoneNumber, options = {}) {
            console.log(`Starting call to: ${phoneNumber} with options:`, options);
            
            if (!phoneNumber) {
                notifyListeners('error', { message: 'Phone number is required' });
                return null;
            }
            
            const formattedNumber = formatPhoneNumber(phoneNumber);
            if (!formattedNumber) {
                notifyListeners('error', { message: 'Invalid phone number' });
                return null;
            }
            
            // If Twilio device is not available, use mock implementation
            if (!twilioDevice || !isInitialized) {
                console.log('Twilio device not available, using mock implementation');
                const connection = mockConnectCall({ To: formattedNumber });
                
                if (connection) {
                    addCallToHistory({
                        type: 'outbound',
                        phoneNumber: formattedNumber,
                        status: 'in-progress',
                        notes: options.notes || '',
                        recording: options.recording || false,
                        mock: true
                    });
                }
                
                return connection;
            }
            
            try {
                // Prepare the call parameters
                const params = {
                    To: formattedNumber,
                    recording: options.recording !== false // Enable recording by default
                };
                
                // Add custom parameters if needed
                if (options.callerId) params.From = options.callerId;
                
                // Make the call
                const connection = twilioDevice.connect(params);
                activeConnection = connection;
                
                // Set up connection event handlers
                setupConnectionEventHandlers(connection);
                
                // Add to call history
                addCallToHistory({
                    type: 'outbound',
                    phoneNumber: formattedNumber,
                    status: 'in-progress',
                    notes: options.notes || '',
                    recording: options.recording !== false
                });
                
                return connection;
            } catch (error) {
                console.error('Error making call:', error);
                notifyListeners('error', { message: 'Failed to make call: ' + error.message });
                
                // Try mock implementation as fallback
                const connection = mockConnectCall({ To: formattedNumber });
                
                if (connection) {
                    addCallToHistory({
                        type: 'outbound',
                        phoneNumber: formattedNumber,
                        status: 'in-progress',
                        notes: options.notes || '',
                        recording: options.recording || false,
                        mock: true
                    });
                }
                
                return connection;
            }
        },
        
        // End the active call
        endCall: function() {
            if (activeConnection) {
                try {
                    activeConnection.disconnect();
                } catch (error) {
                    console.error('Error ending call:', error);
                    notifyListeners('error', { message: 'Failed to end call: ' + error.message });
                    resetCallState();
                }
                
                // Update call history entry
                if (callHistory.length > 0) {
                    callHistory[0].status = 'completed';
                    callHistory[0].duration = callDuration;
                    saveHistories();
                }
                
                return true;
            }
            
            return false;
        },
        
        // Answer an incoming call
        answerCall: function() {
            if (activeConnection && activeConnection.parameters.Direction === 'inbound') {
                try {
                    activeConnection.accept();
                    return true;
                } catch (error) {
                    console.error('Error answering call:', error);
                    notifyListeners('error', { message: 'Failed to answer call: ' + error.message });
                }
            }
            
            return false;
        },
        
        // Reject an incoming call
        rejectCall: function() {
            if (activeConnection && activeConnection.parameters.Direction === 'inbound') {
                try {
                    activeConnection.reject();
                    resetCallState();
                    return true;
                } catch (error) {
                    console.error('Error rejecting call:', error);
                    notifyListeners('error', { message: 'Failed to reject call: ' + error.message });
                    resetCallState();
                }
            }
            
            return false;
        },
        
        // Send DTMF tones
        sendDigits: function(digits) {
            if (activeConnection) {
                try {
                    activeConnection.sendDigits(digits);
                    return true;
                } catch (error) {
                    console.error('Error sending digits:', error);
                    notifyListeners('error', { message: 'Failed to send digits: ' + error.message });
                }
            }
            
            return false;
        },
        
        // Mute/unmute the call
        setMute: function(muted) {
            if (activeConnection) {
                try {
                    activeConnection.mute(muted);
                    notifyListeners('mute', { isMuted: muted });
                    return true;
                } catch (error) {
                    console.error('Error setting mute:', error);
                    notifyListeners('error', { message: 'Failed to ' + (muted ? 'mute' : 'unmute') + ' call: ' + error.message });
                }
            }
            
            return false;
        },
        
        // Get the active call status
        getCallStatus: function() {
            if (!activeConnection) {
                return {
                    status: 'idle',
                    duration: 0
                };
            }
            
            return {
                status: 'in-progress',
                duration: callDuration,
                direction: activeConnection.parameters.Direction,
                from: activeConnection.parameters.From,
                to: activeConnection.parameters.To,
                callSid: activeConnection.parameters.CallSid
            };
        },
        
        // Send an SMS message
        sendSMS: function(to, message, options = {}) {
            if (!to) {
                notifyListeners('error', { message: 'Recipient phone number is required' });
                return Promise.reject(new Error('Recipient phone number is required'));
            }
            
            if (!message) {
                notifyListeners('error', { message: 'Message text is required' });
                return Promise.reject(new Error('Message text is required'));
            }
            
            const formattedNumber = formatPhoneNumber(to);
            if (!formattedNumber) {
                notifyListeners('error', { message: 'Invalid phone number' });
                return Promise.reject(new Error('Invalid phone number'));
            }
            
            // For development or when backend is not available, use mock implementation
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                !config.smsEndpoint) {
                
                console.log('[MOCK] Sending SMS to:', formattedNumber, 'Message:', message);
                
                // Simulate API delay
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const smsData = {
                            to: formattedNumber,
                            message: message,
                            status: 'sent',
                            mock: true
                        };
                        
                        const sms = addSmsToHistory(smsData);
                        
                        notifyListeners('smsSent', smsData);
                        resolve(sms);
                    }, 1000);
                });
            }
            
            // Prepare request payload
            const payload = {
                to: formattedNumber,
                body: message
            };
            
            // Add custom parameters if provided
            if (options.from) payload.from = options.from;
            if (options.mediaUrl) payload.mediaUrl = options.mediaUrl;
            
            // Send the request to the backend
            return fetch(config.smsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to send SMS: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                const smsData = {
                    to: formattedNumber,
                    message: message,
                    status: 'sent',
                    twilioSid: data.sid || null
                };
                
                const sms = addSmsToHistory(smsData);
                
                notifyListeners('smsSent', smsData);
                return sms;
            })
            .catch(error => {
                console.error('Error sending SMS:', error);
                notifyListeners('error', { message: 'Failed to send SMS: ' + error.message });
                
                // Try mock implementation as fallback
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const smsData = {
                            to: formattedNumber,
                            message: message,
                            status: 'sent',
                            mock: true,
                            error: error.message
                        };
                        
                        const sms = addSmsToHistory(smsData);
                        
                        notifyListeners('smsSent', smsData);
                        resolve(sms);
                    }, 1000);
                });
            });
        },
        
        // Get the call history
        getCallHistory: function() {
            return [...callHistory];
        },
        
        // Get the SMS history
        getSMSHistory: function() {
            return [...smsHistory];
        },
        
        // Check if the device is ready
        isReady: function() {
            return isInitialized;
        },
        
        // Format a phone number to E.164 format (public API)
        formatPhoneNumber: formatPhoneNumber
    };
})();

// For backwards compatibility with existing code
window.TwilioIntegration = TwilioIntegration; 