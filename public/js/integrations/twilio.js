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
        transcriptionEndpoint: '/api/twilio/transcription'
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
    
    // Mock implementation for demo purposes
    function mockConnectCall(params) {
        console.log('Connecting call with params:', params);
        
        activeCall = {
            id: 'call-' + Math.floor(Math.random() * 1000000),
            to: params.to,
            from: params.from || 'Your Notary Number',
            startTime: new Date(),
            status: 'in-progress',
            recording: params.recording !== false,
            transcription: params.transcription !== false
        };
        
        // Start call timer
        startCallTimer();
        
        // Notify listeners
        notifyCallListeners('connected', activeCall);
        
        return activeCall;
    }
    
    // Start a call to a client
    function startCall(phoneNumber, options = {}) {
        if (activeCall) {
            console.warn('There is already an active call. Please end it before starting a new one.');
            return false;
        }
        
        const params = {
            to: phoneNumber,
            from: options.from || 'Your Notary Number',
            recording: options.recording !== false,
            transcription: options.transcription !== false,
            callbackUrl: options.callbackUrl || config.apiEndpoint + '/status'
        };
        
        const device = initTwilioDevice();
        
        if (device.ready) {
            return device.connect(params);
        } else {
            console.error('Twilio Device is not ready.');
            return false;
        }
    }
    
    // End the current active call
    function endCall() {
        if (!activeCall) {
            console.warn('No active call to end.');
            return false;
        }
        
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
        startCall,
        endCall,
        hasActiveCall,
        getActiveCall,
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