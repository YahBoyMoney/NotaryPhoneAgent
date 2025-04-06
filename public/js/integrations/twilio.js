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
            console.log('Received mock token, using mock implementation');
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
            notifyListeners('error', { 
                message: 'Failed to initialize Twilio device: ' + error.message,
                code: 'DEVICE_INIT_FAILED',
                details: error 
            });
            
            // Fall back to mock implementation for development
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
                    throw new Error(`Failed to get Twilio access token: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Successfully received Twilio token');
                initDevice(data.token);
                return data;
            })
            .catch(error => {
                console.error('Error getting access token:', error);
                notifyListeners('error', { 
                    message: 'Failed to get access token: ' + error.message,
                    code: 'TOKEN_ERROR',
                    details: error
                });
                
                // Fall back to mock implementation
                console.log('Falling back to mock implementation due to token error');
                useMockImplementation();
                return { mock: true, error: error.message };
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
    
    // Fall back to mock implementation for development or when Twilio is unavailable
    function useMockImplementation() {
        console.log('Using mock Twilio implementation');
        isInitialized = { mock: true };
        notifyListeners('deviceReady', { mock: true });
    }
    
    // Mock connection for local development/testing
    function mockConnectCall(params) {
        console.log('Creating mock connection for:', params);
        
        if (!params || !params.To) {
            console.error('Missing phone number for mock call');
            notifyListeners('error', { 
                message: 'Phone number is required',
                code: 'MISSING_PHONE_NUMBER'
            });
            return null;
        }
        
        const formattedNumber = formatPhoneNumber(params.To);
        if (!formattedNumber) {
            console.error('Invalid phone number for mock call:', params.To);
            notifyListeners('error', { 
                message: 'Invalid phone number',
                code: 'INVALID_PHONE_NUMBER',
                number: params.To
            });
            return null;
        }
        
        const mockCallSid = 'MC' + Date.now() + Math.random().toString(36).substring(2, 8);
        console.log(`Creating mock call with SID ${mockCallSid} to ${formattedNumber}`);
        
        const mockConnection = {
            parameters: {
                CallSid: mockCallSid,
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
                    console.log('[MOCK] Call disconnected');
                    
                    // Update call history
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'completed';
                        callHistory[0].duration = callDuration;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    notifyListeners('disconnected', { 
                        callSid: this.parameters.CallSid, 
                        duration: callDuration,
                        timestamp: new Date().toISOString()
                    });
                    resetCallState();
                }, 500);
                return this;
            }
        };
        
        activeConnection = mockConnection;
        
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
                callSid: mockConnection.parameters.CallSid,
                direction: mockConnection.parameters.Direction,
                from: mockConnection.parameters.From,
                to: mockConnection.parameters.To,
                timestamp: new Date().toISOString()
            });
            startCallDurationTimer();
        }, 1000);
        
        return mockConnection;
    }
    
    // Notify all registered listeners of events
    function notifyListeners(event, data = {}) {
        if (debugMode) {
            console.log(`[Event: ${event}]`, data);
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
            return getAccessToken();
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
                timestamp: new Date().toISOString()
            };
            
            const call = addCallToHistory(callData);
            
            // If Twilio device is not available or we're using the mock implementation
            if (!twilioDevice || isInitialized.mock) {
                console.log('Making call via Netlify Function:', config.callEndpoint);
                
                return fetch(config.callEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: formattedNumber,
                        from: options.from || null,
                        recording: options.recording !== false,
                        callbackUrl: options.callbackUrl || config.statusEndpoint
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to initiate call: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Call initiated successfully:', data);
                    
                    // Update call record with SID
                    if (callHistory.length > 0) {
                        callHistory[0].callSid = data.sid;
                        callHistory[0].status = data.status || 'queued';
                        saveHistories();
                    }
                    
                    // Create a mock connection object to simulate the UI experience
                    const mockConnection = mockConnectCall({ To: formattedNumber });
                    
                    return mockConnection;
                })
                .catch(error => {
                    console.error('Error making call via Netlify Function:', error);
                    
                    // Update call record with error
                    if (callHistory.length > 0) {
                        callHistory[0].status = 'failed';
                        callHistory[0].error = error.message;
                        callHistory[0].endTime = new Date().toISOString();
                        saveHistories();
                    }
                    
                    notifyListeners('error', { 
                        message: 'Failed to make call: ' + error.message,
                        code: 'CALL_FAILED',
                        details: error 
                    });
                    
                    // Fall back to complete mock as last resort
                    console.log('Falling back to mock call implementation');
                    const mockConnection = mockConnectCall({ To: formattedNumber });
                    
                    return mockConnection;
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
                
                // Try using the Netlify function as a fallback
                console.log('Falling back to Netlify Function for making call');
                return this.startCall(phoneNumber, options);
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
                    duration: 0
                };
            }
            
            return {
                status: 'in-progress',
                duration: callDuration,
                direction: activeConnection.parameters.Direction,
                from: activeConnection.parameters.From,
                to: activeConnection.parameters.To,
                callSid: activeConnection.parameters.CallSid,
                timestamp: new Date().toISOString()
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
                timestamp: new Date().toISOString()
            };
            
            const sms = addSmsToHistory(smsData);
            
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
                
                // Try mock implementation as fallback
                console.log('Falling back to mock SMS implementation');
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