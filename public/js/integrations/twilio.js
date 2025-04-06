/**
 * Twilio Integration for Notary Voice Agent
 * Handles call functionality and integration with Twilio services
 */

const TwilioIntegration = (function() {
    // Configuration
    const config = {
        apiEndpoint: '/api/twilio',
        callEndpoint: '/api/twilio/call',
        recordingEndpoint: '/api/twilio/recording',
        transcriptionEndpoint: '/api/twilio/transcription',
        smsEndpoint: '/api/twilio/sms'
    };

    // Private variables
    let activeCall = null;
    let callDuration = 0;
    let callTimer = null;
    let callListeners = [];
    
    // Initialize Twilio Device
    function initTwilioDevice() {
        console.log('Initializing Twilio Device...');
        // In a real implementation, this would initialize the Twilio Device with a token
        // from the server
        
        return {
            ready: true,
            connect: mockConnectCall,
            disconnect: endCall
        };
    }
    
    // Format phone number to E.164 format
    function formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) {
            console.error('No phone number provided to format');
            return null;
        }
        
        // Strip out all non-numeric characters
        let digits = phoneNumber.replace(/\D/g, '');
        
        // Handle empty string after removing non-digits
        if (digits.length === 0) {
            console.error('Phone number contains no digits');
            return null;
        }
        
        // If US/Canada number without country code, add +1
        if (digits.length === 10) {
            return '+1' + digits;
        }
        
        // If it already has country code but no plus, add it
        if (digits.length === 11 && digits.charAt(0) === '1') {
            return '+' + digits;
        }
        
        // If no plus but has international format, add it
        if (digits.length > 10 && digits.charAt(0) !== '+') {
            return '+' + digits;
        }
        
        // Return the digits with a plus if not already there
        return digits.charAt(0) === '+' ? digits : '+' + digits;
    }
    
    // Mock implementation for demo purposes
    function mockConnectCall(params) {
        try {
            console.log('Connecting call with params:', params);
            
            if (!params.to) {
                console.error('No phone number provided');
                notifyCallListeners('error', { message: 'Failed to make call: No phone number provided' });
                return false;
            }
            
            // Format the phone number
            const formattedNumber = formatPhoneNumber(params.to);
            console.log('Formatted phone number:', formattedNumber);
            
            if (!formattedNumber) {
                console.error('Invalid phone number format');
                notifyCallListeners('error', { message: 'Failed to make call: Invalid phone number format' });
                return false;
            }
            
            activeCall = {
                id: 'call-' + Math.floor(Math.random() * 1000000),
                to: formattedNumber,
                from: params.from || 'Your Notary Number',
                startTime: new Date(),
                status: 'in-progress',
                recording: params.recording !== false,
                transcription: params.transcription !== false,
                notes: params.notes || ''
            };
            
            // Start call timer
            startCallTimer();
            
            // Notify listeners
            notifyCallListeners('connected', activeCall);
            
            return activeCall;
        } catch (error) {
            console.error('Error connecting call:', error);
            notifyCallListeners('error', { message: 'Failed to make call: ' + error.message });
            return false;
        }
    }
    
    // Start a call to a client
    function startCall(phoneNumber, options = {}) {
        console.log('TwilioIntegration.startCall called with:', phoneNumber, options);
        
        try {
            if (!phoneNumber) {
                console.error('No phone number provided');
                notifyCallListeners('error', { message: 'Failed to make call: No phone number provided' });
                return false;
            }
            
            if (activeCall) {
                console.warn('There is already an active call. Please end it before starting a new one.');
                notifyCallListeners('error', { message: 'There is already an active call. Please end it before starting a new one.' });
                return false;
            }
            
            // Format the phone number before using it
            const formattedNumber = formatPhoneNumber(phoneNumber);
            if (!formattedNumber) {
                console.error('Invalid phone number format');
                notifyCallListeners('error', { message: 'Failed to make call: Invalid phone number format' });
                return false;
            }
            
            const params = {
                to: formattedNumber,
                from: options.from || 'Your Notary Number',
                recording: options.recording !== false,
                transcription: options.transcription !== false,
                callbackUrl: options.callbackUrl || config.apiEndpoint + '/status',
                notes: options.notes || ''
            };
            
            const device = initTwilioDevice();
            
            if (device.ready) {
                console.log('Twilio device ready, connecting call...');
                return device.connect(params);
            } else {
                console.error('Twilio Device is not ready.');
                notifyCallListeners('error', { message: 'Twilio Device is not ready.' });
                return false;
            }
        } catch (error) {
            console.error('Error starting call:', error);
            notifyCallListeners('error', { message: 'Failed to make call: ' + error.message });
            return false;
        }
    }
    
    // Send an SMS
    function sendSMS(to, message, options = {}) {
        console.log('Sending SMS to:', to, 'Message:', message);
        
        if (!to || !message) {
            console.error('Phone number and message are required to send SMS');
            notifyCallListeners('error', { message: 'Failed to send SMS: Phone number and message are required' });
            return false;
        }
        
        try {
            // Format the phone number
            const formattedNumber = formatPhoneNumber(to);
            console.log('Formatted SMS phone number:', formattedNumber);
            
            if (!formattedNumber) {
                console.error('Invalid phone number format for SMS');
                notifyCallListeners('error', { message: 'Failed to send SMS: Invalid phone number format' });
                return false;
            }
            
            // In a real implementation, this would make an API call to send the SMS
            // For demo purposes, we'll simulate a successful send
            
            const smsId = 'sms-' + Math.floor(Math.random() * 1000000);
            
            const sms = {
                id: smsId,
                to: formattedNumber,
                from: options.from || 'Your Notary Number',
                body: message,
                sentTime: new Date(),
                status: 'sent'
            };
            
            // Store SMS in history
            saveSmsToHistory(sms);
            
            // Notify listeners
            notifyCallListeners('smsSent', sms);
            
            return sms;
        } catch (error) {
            console.error('Error sending SMS:', error);
            notifyCallListeners('error', { message: 'Failed to send SMS: ' + error.message });
            return false;
        }
    }
    
    // End the current active call
    function endCall() {
        if (!activeCall) {
            console.warn('No active call to end.');
            return false;
        }
        
        try {
            // Stop the timer
            stopCallTimer();
            
            // Set call end time and status
            activeCall.endTime = new Date();
            activeCall.status = 'completed';
            activeCall.duration = callDuration;
            
            // In a real implementation, this would send a request to end the call on Twilio
            
            // Notify listeners
            notifyCallListeners('disconnected', activeCall);
            
            // Generate a call summary (mock implementation)
            generateCallSummary(activeCall);
            
            // Store call history
            saveCallToHistory(activeCall);
            
            // Clear active call
            const completedCall = {...activeCall};
            activeCall = null;
            callDuration = 0;
            
            return completedCall;
        } catch (error) {
            console.error('Error ending call:', error);
            return false;
        }
    }
    
    // Save SMS to history
    function saveSmsToHistory(sms) {
        // In a real implementation, this would send the SMS data to the backend
        // for storage in a database
        
        // For demo purposes, we'll store it in localStorage
        try {
            const smsHistory = JSON.parse(localStorage.getItem('smsHistory') || '[]');
            smsHistory.push(sms);
            localStorage.setItem('smsHistory', JSON.stringify(smsHistory));
            
            console.log('SMS saved to history:', sms);
        } catch (error) {
            console.error('Error saving SMS to history:', error);
        }
    }
    
    // Get SMS history
    function getSmsHistory() {
        try {
            return JSON.parse(localStorage.getItem('smsHistory') || '[]');
        } catch (error) {
            console.error('Error getting SMS history:', error);
            return [];
        }
    }
    
    // Start the call timer
    function startCallTimer() {
        callDuration = 0;
        callTimer = setInterval(() => {
            callDuration++;
            updateCallDurationDisplay();
            notifyCallListeners('tick', { duration: callDuration });
        }, 1000);
    }
    
    // Stop the call timer
    function stopCallTimer() {
        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
        }
    }
    
    // Update the call duration display
    function updateCallDurationDisplay() {
        // Format time as HH:MM:SS
        const hours = Math.floor(callDuration / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((callDuration % 3600) / 60).toString().padStart(2, '0');
        const seconds = (callDuration % 60).toString().padStart(2, '0');
        
        const formattedTime = `${hours}:${minutes}:${seconds}`;
        
        // Update UI if element exists
        const durationElement = document.getElementById('activeCallDuration');
        if (durationElement) {
            durationElement.textContent = formattedTime;
        }
        
        return formattedTime;
    }
    
    // Generate a call summary using AI
    function generateCallSummary(call) {
        console.log('Generating call summary for call:', call.id);
        
        // In a real implementation, this would send the transcription to the backend
        // for processing with AI to generate a summary
        
        // Mock summary generation
        setTimeout(() => {
            const summary = {
                callId: call.id,
                date: call.startTime,
                duration: call.duration,
                topics: ['Notary service inquiry', 'Document verification', 'Appointment scheduling'],
                summary: 'Client inquired about notary services for mortgage documents. Scheduled an appointment for next Tuesday at 2 PM. Client will bring identification and all required documents.',
                tags: ['mortgage', 'appointment', 'document verification'],
                nextSteps: ['Confirm appointment', 'Prepare forms', 'Send reminder']
            };
            
            notifyCallListeners('summary', summary);
            
            // Save summary to call history
            saveCallSummary(call.id, summary);
        }, 2000);
    }
    
    // Save call to history
    function saveCallToHistory(call) {
        // In a real implementation, this would send the call data to the backend
        // for storage in a database
        
        // For demo purposes, we'll store it in localStorage
        try {
            const callHistory = JSON.parse(localStorage.getItem('callHistory') || '[]');
            callHistory.push(call);
            localStorage.setItem('callHistory', JSON.stringify(callHistory));
            
            console.log('Call saved to history:', call);
        } catch (error) {
            console.error('Error saving call to history:', error);
        }
    }
    
    // Save call summary
    function saveCallSummary(callId, summary) {
        // In a real implementation, this would send the summary to the backend
        // for storage in a database
        
        // For demo purposes, we'll store it in localStorage
        try {
            const callSummaries = JSON.parse(localStorage.getItem('callSummaries') || '{}');
            callSummaries[callId] = summary;
            localStorage.setItem('callSummaries', JSON.stringify(callSummaries));
            
            console.log('Call summary saved:', summary);
        } catch (error) {
            console.error('Error saving call summary:', error);
        }
    }
    
    // Get call history
    function getCallHistory() {
        try {
            return JSON.parse(localStorage.getItem('callHistory') || '[]');
        } catch (error) {
            console.error('Error getting call history:', error);
            return [];
        }
    }
    
    // Get call summary
    function getCallSummary(callId) {
        try {
            const callSummaries = JSON.parse(localStorage.getItem('callSummaries') || '{}');
            return callSummaries[callId] || null;
        } catch (error) {
            console.error('Error getting call summary:', error);
            return null;
        }
    }
    
    // Add call event listener
    function addCallListener(listener) {
        if (typeof listener === 'function') {
            callListeners.push(listener);
        }
    }
    
    // Remove call event listener
    function removeCallListener(listener) {
        const index = callListeners.indexOf(listener);
        if (index !== -1) {
            callListeners.splice(index, 1);
        }
    }
    
    // Notify all call listeners of an event
    function notifyCallListeners(event, data) {
        callListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in call listener:', error);
            }
        });
    }
    
    // Check if there is an active call
    function hasActiveCall() {
        return activeCall !== null;
    }
    
    // Get active call information
    function getActiveCall() {
        return activeCall;
    }
    
    // Public API
    return {
        init: initTwilioDevice,
        startCall,
        endCall,
        sendSMS,
        getSmsHistory,
        hasActiveCall: () => activeCall !== null,
        getActiveCall: () => activeCall ? {...activeCall} : null,
        getCallHistory,
        getCallSummary,
        addCallListener,
        removeCallListener
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwilioIntegration;
} 