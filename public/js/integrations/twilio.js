/**
 * Twilio Integration for Notary Voice Agent
 * Provides real-time voice calling and SMS functionality
 */

const TwilioIntegration = (function() {
    // Configuration
    const config = {
        tokenEndpoint: '/.netlify/functions/twilio-token',
        callEndpoint: '/.netlify/functions/twilio-call',
        recordingEndpoint: '/.netlify/functions/twilio-recording',
        transcriptionEndpoint: '/.netlify/functions/twilio-transcription',
        smsEndpoint: '/.netlify/functions/twilio-sms',
        statusEndpoint: '/.netlify/functions/call-status'
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
    let debugMode = true; // Set to true for detailed logging
    let isMockMode = false; // Default to real mode and only fall back to mock when necessary
    
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
            
            if (debugMode) {
                console.log(`Loaded ${callHistory.length} call records and ${smsHistory.length} SMS records from local storage`);
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
            
            if (debugMode) {
                console.log(`Saved ${callHistory.length} call records and ${smsHistory.length} SMS records to local storage`);
            }
        } catch (error) {
            console.error('Error saving Twilio histories:', error);
        }
    }

    // Initialize the Twilio device
    function initDevice(token) {
        accessToken = token;
        
        // Check if token is a mock token (from development environment)
        const isMockToken = token && token.startsWith('mock_token_');
        
        if (isMockToken) {
            console.error('Real Twilio functionality requested but received mock token');
            notifyListeners('error', { 
                message: 'Unable to use Twilio: Missing Twilio credentials in your environment.',
                code: 'TWILIO_CREDENTIALS_MISSING'
            });
            
            // Show a prominent banner alerting the user they're in mock mode
            showMockModeBanner();
            
            // Fall back to mock implementation
            isMockMode = true;
            useMockImplementation();
            return;
        }
        
        // Check if the Twilio SDK is available
        if (typeof Twilio === 'undefined' || typeof Twilio.Device === 'undefined') {
            console.error('Twilio SDK not loaded');
            notifyListeners('error', { 
                message: 'Twilio SDK not loaded. Please check your internet connection and refresh the page.',
                code: 'TWILIO_SDK_MISSING'
            });
            
            // Show a prominent banner alerting the user they're in mock mode
            showMockModeBanner();
            
            // Fall back to mock implementation
            isMockMode = true;
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
            isMockMode = false;
            
            // Remove mock mode banner if it exists
            removeMockModeBanner();
            
            console.log('Twilio device initialized successfully');
        } catch (error) {
            console.error('Error initializing Twilio device:', error);
            notifyListeners('error', { 
                message: 'Failed to initialize Twilio device: ' + error.message,
                code: 'DEVICE_INIT_FAILED',
                details: error 
            });
            
            // Show a prominent banner alerting the user they're in mock mode
            showMockModeBanner();
            
            // Fall back to mock implementation
            isMockMode = true;
            useMockImplementation();
        }
    }
    
    // Set up event handlers for the Twilio device
    function setupDeviceEventHandlers() {
        if (!twilioDevice) return;
        
        twilioDevice.on('registered', function() {
            console.log('Twilio device registered');
            notifyListeners('registered');
        });
        
        twilioDevice.on('error', function(error) {
            console.error('Twilio device error:', error);
            notifyListeners('error', { 
                message: error.message || 'Unknown Twilio error',
                code: 'DEVICE_ERROR',
                details: error
            });
        });
        
        twilioDevice.on('incoming', function(connection) {
            console.log('Incoming call from:', connection.parameters.From);
            activeConnection = connection;
            
            // Add to call history immediately
            const callData = {
                type: 'inbound',
                phoneNumber: connection.parameters.From,
                status: 'ringing',
                callSid: connection.parameters.CallSid,
                timestamp: new Date().toISOString()
            };
            
            addCallToHistory(callData);
            
            notifyListeners('incoming', { 
                from: connection.parameters.From,
                callSid: connection.parameters.CallSid,
                timestamp: new Date().toISOString()
            });
            
            setupConnectionEventHandlers(connection);
        });
        
        twilioDevice.on('cancel', function() {
            console.log('Call cancelled');
            
            // Update call history if there's an active call
            if (callHistory.length > 0) {
                callHistory[0].status = 'cancelled';
                callHistory[0].endTime = new Date().toISOString();
                saveHistories();
            }
            
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
            console.log('Call accepted:', connection.parameters);
            
            // Update call history
            if (callHistory.length > 0) {
                callHistory[0].status = 'in-progress';
                callHistory[0].startTime = new Date().toISOString();
                saveHistories();
            }
            
            notifyListeners('connected', { 
                callSid: connection.parameters.CallSid,
                direction: connection.parameters.Direction,
                from: connection.parameters.From,
                to: connection.parameters.To,
                timestamp: new Date().toISOString()
            });
            startCallDurationTimer();
        });
        
        connection.on('disconnect', function() {
            console.log('Call disconnected:', connection.parameters.CallSid);
            
            // Update call history
            if (callHistory.length > 0) {
                callHistory[0].status = 'completed';
                callHistory[0].duration = callDuration;
                callHistory[0].endTime = new Date().toISOString();
                saveHistories();
            }
            
            notifyListeners('disconnected', { 
                callSid: connection.parameters.CallSid,
                duration: callDuration,
                timestamp: new Date().toISOString()
            });
            resetCallState();
        });
        
        connection.on('error', function(error) {
            console.error('Connection error:', error);
            
            // Update call history
            if (callHistory.length > 0) {
                callHistory[0].status = 'failed';
                callHistory[0].error = error.message || 'Unknown error';
                callHistory[0].endTime = new Date().toISOString();
                saveHistories();
            }
            
            notifyListeners('error', { 
                message: error.message || 'Call connection error',
                code: 'CONNECTION_ERROR',
                details: error 
            });
        });
        
        connection.on('mute', function(isMuted) {
            console.log('Call ' + (isMuted ? 'muted' : 'unmuted'));
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
        console.log('Getting Twilio access token from', config.tokenEndpoint);
        
        return fetch(config.tokenEndpoint)
            .then(response => {
                if (!response.ok) {
                    const statusCode = response.status;
                    if (statusCode === 500) {
                        throw new Error('Twilio credentials missing. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your Netlify environment variables.');
                    }
                    throw new Error(`Failed to get Twilio access token: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (!data.token) {
                    throw new Error('Token missing from server response');
                }
                
                if (data.token.startsWith('mock_token_')) {
                    throw new Error('Real Twilio functionality requested but received mock token. Please configure Twilio credentials.');
                }
                
                console.log('Successfully received Twilio token');
                initDevice(data.token);
                return data;
            })
            .catch(error => {
                console.error('Error getting access token:', error);
                notifyListeners('error', { 
                    message: 'Failed to get real Twilio access token: ' + error.message,
                    code: 'TOKEN_ERROR',
                    details: error
                });
                
                throw error; // Let caller handle the error instead of falling back to mock
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
        if (!phoneNumber) {
            console.error('Empty phone number provided');
            return '';
        }
        
        // Handle special characters
        let cleaned = phoneNumber.trim();
        
        // Check if already in E.164 format
        if (cleaned.match(/^\+[1-9]\d{1,14}$/)) {
            console.log(`Phone number ${phoneNumber} already in E.164 format`);
            return cleaned;
        }
        
        // Remove all non-digit characters
        cleaned = cleaned.replace(/\D/g, '');
        
        if (cleaned.length === 0) {
            console.error('Invalid phone number after cleaning:', phoneNumber);
            return '';
        }
        
        // Check if the number already has a country code (assumed to be +1 for US)
        if (phoneNumber.startsWith('+')) {
            console.log(`Formatted phone number ${phoneNumber} to +${cleaned}`);
            return '+' + cleaned;
        }
        
        // Add +1 for US numbers if the number has 10 digits
        if (cleaned.length === 10) {
            console.log(`Formatted 10-digit phone number ${phoneNumber} to +1${cleaned}`);
            return '+1' + cleaned;
        }
        
        // If the number starts with 1 and has 11 digits, assume it's a US number
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            console.log(`Formatted 11-digit phone number ${phoneNumber} to +${cleaned}`);
            return '+' + cleaned;
        }
        
        // Otherwise, just return with a plus sign
        console.log(`Formatted phone number ${phoneNumber} to +${cleaned} using default rules`);
        return '+' + cleaned;
    }
    
    // Helper functions for mock mode UI
    function showMockModeBanner() {
        // Remove existing banner if it exists
        removeMockModeBanner();
        
        // Create a new banner
        const banner = document.createElement('div');
        banner.id = 'mock-mode-banner';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.backgroundColor = '#f44336';
        banner.style.color = 'white';
        banner.style.padding = '10px';
        banner.style.textAlign = 'center';
        banner.style.zIndex = '9999';
        banner.style.fontWeight = 'bold';
        
        banner.innerHTML = `
            ⚠️ MOCK MODE ACTIVE: Calls and SMS will be simulated. To enable real Twilio functionality, 
            please set up your Twilio account credentials in Netlify environment variables. 
            <a href="https://docs.netlify.com/configure-builds/environment-variables/" 
               style="color: white; text-decoration: underline;" 
               target="_blank">Learn more</a>
        `;
        
        document.body.appendChild(banner);
        
        // Add some margin to the top of the body to prevent content from being hidden behind banner
        document.body.style.marginTop = (banner.offsetHeight + 5) + 'px';
    }
    
    function removeMockModeBanner() {
        const existingBanner = document.getElementById('mock-mode-banner');
        if (existingBanner) {
            document.body.removeChild(existingBanner);
            document.body.style.marginTop = '0';
        }
    }

    // Mock implementation for development without Twilio credentials
    function useMockImplementation() {
        console.log('Using mock implementation for Twilio');
        isInitialized = true;
        isMockMode = true;
        notifyListeners('mockMode', { active: true });
    }

    // Mock function to simulate connecting a call
    function mockConnectCall(params) {
        console.log('MOCK: Connecting call to', params.To, 'with params:', params);
        
        // Show warning about mock mode
        alert('MOCK MODE: This is a simulated call. No real calls will be made because Twilio credentials are not configured.');
        
        // Create a mock connection object
        activeConnection = {
            parameters: {
                From: params.From || '+15555555555',
                To: params.To,
                CallSid: 'mock_call_' + Math.random().toString(36).substring(2, 15),
                Direction: 'outbound-api'
            },
            status: function() { return 'open'; },
            disconnect: function() {
                console.log('MOCK: Disconnecting call');
                mockDisconnectCall();
            },
            on: function(event, callback) {
                // Store callback to simulate events
                if (!listeners['connection_' + event]) {
                    listeners['connection_' + event] = [];
                }
                listeners['connection_' + event].push(callback);
                return this;
            }
        };
        
        // Simulate connection setup
        setTimeout(() => {
            console.log('[MOCK] Call connected');
            
            // Update call history
            if (callHistory.length > 0) {
                callHistory[0].status = 'in-progress';
                callHistory[0].startTime = new Date().toISOString();
                saveHistories();
            }
            
            notifyListeners('connected', {
                callSid: activeConnection.parameters.CallSid,
                direction: activeConnection.parameters.Direction,
                from: activeConnection.parameters.From,
                to: activeConnection.parameters.To,
                timestamp: new Date().toISOString(),
                mock: true // Explicitly mark as mock
            });
            startCallDurationTimer();
        }, 1000);
        
        return activeConnection;
    }
    
    // Notify all registered listeners of events
    function notifyListeners(event, data = {}) {
        if (debugMode) {
            console.log(`[Event: ${event}]`, data);
        }
        
        // Add mock flag if we're in mock mode
        if (isMockMode && !data.mock) {
            data.mock = true;
        }
        
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
            id: 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            timestamp: new Date().toISOString(),
            ...callData
        };
        
        // Add mock flag if appropriate
        if (isMockMode && !call.mock) {
            call.mock = true;
        }
        
        console.log('Adding call to history:', call);
        callHistory.unshift(call);
        
        // Limit history to 100 entries
        if (callHistory.length > 100) {
            callHistory = callHistory.slice(0, 100);
        }
        
        saveHistories();
        
        // Notify listeners about new call record
        notifyListeners('callHistoryUpdated', { call });
        
        return call;
    }
    
    // Add an SMS to the history
    function addSmsToHistory(smsData) {
        const sms = {
            id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            timestamp: new Date().toISOString(),
            ...smsData
        };
        
        // Add mock flag if appropriate
        if (isMockMode && !sms.mock) {
            sms.mock = true;
        }
        
        console.log('Adding SMS to history:', sms);
        smsHistory.unshift(sms);
        
        // Limit history to 100 entries
        if (smsHistory.length > 100) {
            smsHistory = smsHistory.slice(0, 100);
        }
        
        saveHistories();
        
        // Notify listeners about new SMS record
        notifyListeners('smsHistoryUpdated', { sms });
        
        return sms;
    }

    // Public API
    return {
        // Initialize the Twilio integration
        init: function(options = {}) {
            if (isInitialized) return Promise.resolve(isInitialized);
            
            // Set debug mode if specified
            if (options.debug !== undefined) {
                debugMode = options.debug;
            }
            
            console.log('Initializing Twilio integration, debug mode:', debugMode);
            
            // Load histories from local storage
            loadHistories();
            
            // Get access token and initialize device
            return getAccessToken()
                .catch(error => {
                    console.error('Failed to initialize Twilio:', error);
                    // Ensure we have a mockable fallback even on critical errors
                    isMockMode = true;
                    useMockImplementation();
                    return { mock: true, error: error.message };
                });
        },
        
        // Register a listener for Twilio events
        addListener: function(callback) {
            if (typeof callback === 'function') {
                listeners.push(callback);
                console.log(`Added listener, total listeners: ${listeners.length}`);
            }
        },
        
        // Remove a listener
        removeListener: function(callback) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
                console.log(`Removed listener, total listeners: ${listeners.length}`);
            }
        },
        
        // Start a call to the specified phone number
        startCall: function(phoneNumber, options = {}) {
            console.log(`Starting call to: ${phoneNumber} with options:`, options);
            
            if (!phoneNumber) {
                const error = 'Phone number is required';
                console.error(error);
                notifyListeners('error', { 
                    message: error,
                    code: 'MISSING_PHONE_NUMBER'
                });
                return null;
            }
            
            const formattedNumber = formatPhoneNumber(phoneNumber);
            if (!formattedNumber) {
                const error = `Invalid phone number: ${phoneNumber}`;
                console.error(error);
                notifyListeners('error', { 
                    message: error,
                    code: 'INVALID_PHONE_NUMBER',
                    number: phoneNumber
                });
                return null;
            }
            
            // Add to call history first so we can update the status later
            const callData = {
                type: 'outbound',
                phoneNumber: formattedNumber,
                status: 'initiating',
                notes: options.notes || '',
                recording: options.recording !== false,
                timestamp: new Date().toISOString(),
                mock: isMockMode // Mark as mock if we're in mock mode
            };
            
            const call = addCallToHistory(callData);
            
            // If mock mode or Twilio device not available, use mock implementation
            if (isMockMode || !twilioDevice || isInitialized.mock) {
                console.log('Using mock call implementation');
                
                // First add call to history
                const callData = {
                    type: 'outbound',
                    phoneNumber: formattedNumber,
                    status: 'dialing',
                    timestamp: new Date().toISOString()
                };
                
                addCallToHistory(callData);
                
                // Then trigger mock connection
                setTimeout(() => {
                    mockConnectCall({ 
                        To: formattedNumber,
                        From: options.from || '+15555555555',
                        ...options 
                    });
                    
                    // Simulate connected event after a short delay
                    setTimeout(() => {
                        if (listeners['connection_accept'] && listeners['connection_accept'].length) {
                            listeners['connection_accept'].forEach(callback => callback());
                        }
                        
                        notifyListeners('connected', {
                            to: formattedNumber,
                            from: options.from || '+15555555555',
                            direction: 'outbound',
                            timestamp: new Date().toISOString()
                        });
                        
                        startCallDurationTimer();
                    }, 1500);
                }, 1000);
                
                return Promise.resolve({
                    status: 'mock-initiated',
                    phoneNumber: formattedNumber
                });
            }
            
            // If Twilio device is available, use it to make the call
            try {
                // Prepare the call parameters
                const params = {
                    To: formattedNumber,
                    recording: options.recording !== false, // Enable recording by default
                    callerId: options.callerId || null,
                    CallerId: options.callerId || null // Some versions of Twilio client use this capitalization
                };
                
                // Make the call
                console.log('Making call via Twilio Device with params:', params);
                const connection = twilioDevice.connect(params);
                activeConnection = connection;
                
                // Set up connection event handlers
                setupConnectionEventHandlers(connection);
                
                return connection;
            } catch (error) {
                console.error('Error making call via Twilio Device:', error);
                
                // Update call record with error
                if (callHistory.length > 0) {
                    callHistory[0].status = 'failed';
                    callHistory[0].error = error.message;
                    callHistory[0].endTime = new Date().toISOString();
                    saveHistories();
                }
                
                notifyListeners('error', { 
                    message: 'Failed to make call: ' + error.message,
                    code: 'TWILIO_CONNECT_ERROR',
                    details: error 
                });
                
                // Fall back to mock implementation
                console.log('Falling back to mock call implementation after error');
                isMockMode = true;
                return mockConnectCall({ To: formattedNumber });
            }
        },
        
        // End the active call
        endCall: function() {
            console.log('Ending call...');
            
            if (activeConnection) {
                try {
                    activeConnection.disconnect();
                    
                    // Update call history entry
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'completed';
                        callHistory[0].duration = callDuration;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error ending call:', error);
                    
                    // Update call history with error
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'failed';
                        callHistory[0].error = error.message;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    notifyListeners('error', { 
                        message: 'Failed to end call: ' + error.message,
                        code: 'END_CALL_FAILED',
                        details: error 
                    });
                    resetCallState();
                }
            } else {
                console.log('No active call to end');
            }
            
            return false;
        },
        
        // Check if there's an active call
        hasActiveCall: function() {
            return !!activeConnection;
        },
        
        // Get information about the active call
        getActiveCall: function() {
            if (!activeConnection) return null;
            
            return {
                status: 'in-progress',
                duration: callDuration,
                direction: activeConnection.parameters.Direction,
                from: activeConnection.parameters.From,
                to: activeConnection.parameters.To,
                callSid: activeConnection.parameters.CallSid,
                timestamp: new Date().toISOString(),
                mock: isMockMode // Indicate if this is a mock call
            };
        },
        
        // Answer an incoming call
        answerCall: function() {
            console.log('Answering incoming call...');
            
            if (activeConnection && activeConnection.parameters.Direction === 'inbound') {
                try {
                    activeConnection.accept();
                    
                    // Update call history
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'in-progress';
                        callHistory[0].startTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error answering call:', error);
                    
                    // Update call history with error
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'failed';
                        callHistory[0].error = error.message;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    notifyListeners('error', { 
                        message: 'Failed to answer call: ' + error.message,
                        code: 'ANSWER_CALL_FAILED',
                        details: error 
                    });
                }
            } else {
                console.log('No incoming call to answer');
            }
            
            return false;
        },
        
        // Reject an incoming call
        rejectCall: function() {
            console.log('Rejecting incoming call...');
            
            if (activeConnection && activeConnection.parameters.Direction === 'inbound') {
                try {
                    activeConnection.reject();
                    
                    // Update call history
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'rejected';
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    resetCallState();
                    return true;
                } catch (error) {
                    console.error('Error rejecting call:', error);
                    
                    // Update call history with error
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'failed';
                        callHistory[0].error = error.message;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    notifyListeners('error', { 
                        message: 'Failed to reject call: ' + error.message,
                        code: 'REJECT_CALL_FAILED',
                        details: error 
                    });
                    resetCallState();
                }
            } else {
                console.log('No incoming call to reject');
            }
            
            return false;
        },
        
        // Send DTMF tones
        sendDigits: function(digits) {
            console.log('Sending DTMF digits:', digits);
            
            if (activeConnection) {
                try {
                    activeConnection.sendDigits(digits);
                    return true;
                } catch (error) {
                    console.error('Error sending digits:', error);
                    notifyListeners('error', { 
                        message: 'Failed to send digits: ' + error.message,
                        code: 'SEND_DIGITS_FAILED',
                        details: error 
                    });
                }
            } else {
                console.log('No active call to send digits to');
            }
            
            return false;
        },
        
        // Mute/unmute the call
        setMute: function(muted) {
            console.log('Setting mute to:', muted);
            
            if (activeConnection) {
                try {
                    activeConnection.mute(muted);
                    notifyListeners('mute', { isMuted: muted });
                    return true;
                } catch (error) {
                    console.error('Error setting mute:', error);
                    notifyListeners('error', { 
                        message: 'Failed to ' + (muted ? 'mute' : 'unmute') + ' call: ' + error.message,
                        code: 'MUTE_FAILED',
                        details: error 
                    });
                }
            } else {
                console.log('No active call to mute/unmute');
            }
            
            return false;
        },
        
        // Get the active call status
        getCallStatus: function() {
            if (!activeConnection) {
                return {
                    status: 'idle',
                    duration: 0,
                    mock: isMockMode
                };
            }
            
            return {
                status: 'in-progress',
                duration: callDuration,
                direction: activeConnection.parameters.Direction,
                from: activeConnection.parameters.From,
                to: activeConnection.parameters.To,
                callSid: activeConnection.parameters.CallSid,
                timestamp: new Date().toISOString(),
                mock: isMockMode
            };
        },
        
        // Send an SMS message
        sendSMS: function(to, message, options = {}) {
            console.log(`Sending SMS to: ${to}, message: ${message}`);
            
            if (!to) {
                const error = 'Recipient phone number is required';
                console.error(error);
                notifyListeners('error', { 
                    message: error,
                    code: 'MISSING_RECIPIENT'
                });
                return Promise.reject(new Error(error));
            }
            
            if (!message) {
                const error = 'Message text is required';
                console.error(error);
                notifyListeners('error', { 
                    message: error,
                    code: 'MISSING_MESSAGE'
                });
                return Promise.reject(new Error(error));
            }
            
            const formattedNumber = formatPhoneNumber(to);
            if (!formattedNumber) {
                const error = `Invalid phone number: ${to}`;
                console.error(error);
                notifyListeners('error', { 
                    message: error,
                    code: 'INVALID_PHONE_NUMBER',
                    number: to
                });
                return Promise.reject(new Error(error));
            }
            
            console.log('Sending SMS to', formattedNumber, 'via', config.smsEndpoint);
            
            // Add to SMS history first so we can update the status later
            const smsData = {
                to: formattedNumber,
                message: message,
                status: 'sending',
                timestamp: new Date().toISOString(),
                mock: isMockMode
            };
            
            const sms = addSmsToHistory(smsData);
            
            // If in mock mode, just simulate success after a delay
            if (isMockMode) {
                console.log('Using mock SMS implementation');
                return new Promise((resolve) => {
                    setTimeout(() => {
                        // Update SMS history with mock status
                        if (smsHistory.length > 0) {
                            smsHistory[0].status = 'sent';
                            smsHistory[0].mock = true;
                            smsHistory[0].sentTime = new Date().toISOString();
                            saveHistories();
                        }
                        
                        notifyListeners('smsSent', {
                            to: formattedNumber,
                            message: message,
                            status: 'sent',
                            mock: true,
                            timestamp: new Date().toISOString()
                        });
                        
                        resolve(sms);
                    }, 1000);
                });
            }
            
            // Send the request to the Netlify function
            return fetch(config.smsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: formattedNumber,
                    body: message,
                    from: options.from || null,
                    mediaUrl: options.mediaUrl || null
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to send SMS: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('SMS sent successfully:', data);
                
                // Update SMS history with success status
                if (smsHistory.length > 0) {
                    smsHistory[0].status = 'sent';
                    smsHistory[0].sid = data.sid || null;
                    smsHistory[0].sentTime = new Date().toISOString();
                    saveHistories();
                }
                
                notifyListeners('smsSent', {
                    to: formattedNumber,
                    message: message,
                    status: 'sent',
                    sid: data.sid || null,
                    timestamp: new Date().toISOString()
                });
                
                return sms;
            })
            .catch(error => {
                console.error('Error sending SMS:', error);
                
                // Update SMS history with error status
                if (smsHistory.length > 0) {
                    smsHistory[0].status = 'failed';
                    smsHistory[0].error = error.message;
                    smsHistory[0].timestamp = new Date().toISOString();
                    saveHistories();
                }
                
                notifyListeners('error', { 
                    message: 'Failed to send SMS: ' + error.message,
                    code: 'SMS_FAILED',
                    details: error 
                });
                
                // Fall back to mock implementation
                console.log('Falling back to mock SMS implementation after error');
                isMockMode = true;
                return new Promise((resolve) => {
                    setTimeout(() => {
                        // Update SMS history with mock status
                        if (smsHistory.length > 0) {
                            smsHistory[0].status = 'sent';
                            smsHistory[0].mock = true;
                            smsHistory[0].sentTime = new Date().toISOString();
                            saveHistories();
                        }
                        
                        notifyListeners('smsSent', {
                            to: formattedNumber,
                            message: message,
                            status: 'sent',
                            mock: true,
                            timestamp: new Date().toISOString()
                        });
                        
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
        
        // Check if we're in mock mode
        isMockMode: function() {
            return isMockMode;
        },
        
        // Format a phone number to E.164 format (public API)
        formatPhoneNumber: formatPhoneNumber,
        
        // Set debug mode
        setDebugMode: function(enable) {
            debugMode = enable;
            console.log('Twilio integration debug mode set to:', debugMode);
        }
    };
})();

// For backwards compatibility with existing code
window.TwilioIntegration = TwilioIntegration; 