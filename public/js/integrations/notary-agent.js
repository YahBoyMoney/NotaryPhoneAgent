/**
 * Notary Voice Agent Integration
 * Combines Twilio and ElevenLabs integrations for a complete notary voice agent
 */

const NotaryVoiceAgent = (function() {
    // Configuration
    const config = {
        apiEndpoint: '/api/notary-agent',
        voiceEndpoint: '/api/voice',
        transcriptEndpoint: '/api/transcript',
        appointmentEndpoint: '/api/appointments'
    };

    // Private variables
    let isInitialized = false;
    let activeCall = null;
    let agentListeners = [];
    let transcriptItems = [];
    
    // Initialize the agent
    function init() {
        console.log('Initializing NotaryVoiceAgent...');
        
        try {
            // Check if dependencies are available
            if (typeof TwilioIntegration === 'undefined') {
                console.error('TwilioIntegration is not available');
                return false;
            }
            
            if (typeof ElevenLabsIntegration === 'undefined') {
                console.warn('ElevenLabsIntegration is not available, voice features will be limited');
            }
            
            // Initialize Twilio
            TwilioIntegration.init();
            
            // Initialize ElevenLabs if available
            if (typeof ElevenLabsIntegration !== 'undefined') {
                ElevenLabsIntegration.init();
            }
            
            // Set up event listeners
            setupEventListeners();
            
            isInitialized = true;
            console.log('NotaryVoiceAgent initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing NotaryVoiceAgent:', error);
            return false;
        }
    }
    
    // Set up event listeners for Twilio and ElevenLabs events
    function setupEventListeners() {
        // Add Twilio call listener
        TwilioIntegration.addCallListener((event, data) => {
            console.log('Twilio event:', event, data);
            
            switch (event) {
                case 'connected':
                    handleCallConnected(data);
                    break;
                case 'disconnected':
                    handleCallDisconnected(data);
                    break;
                case 'summary':
                    handleCallSummary(data);
                    break;
                case 'transcription':
                    handleTranscription(data);
                    break;
            }
            
            // Propagate event to agent listeners
            notifyAgentListeners('twilio', { event, data });
        });
        
        // Add ElevenLabs listener if available
        if (typeof ElevenLabsIntegration !== 'undefined') {
            ElevenLabsIntegration.addListener((event, data) => {
                console.log('ElevenLabs event:', event, data);
                
                // Propagate event to agent listeners
                notifyAgentListeners('elevenlabs', { event, data });
            });
        }
    }
    
    // Handle call connected event
    function handleCallConnected(call) {
        activeCall = call;
        
        // Add to transcript
        addToTranscript('system', 'Call connected');
        
        // Greet the client if ElevenLabs is available
        if (typeof ElevenLabsIntegration !== 'undefined') {
            setTimeout(() => {
                const greeting = "Hello, this is the Notary Voice Agent. How can I assist you with notary services today?";
                ElevenLabsIntegration.speak(greeting);
                addToTranscript('agent', greeting);
            }, 1000);
        }
    }
    
    // Handle call disconnected event
    function handleCallDisconnected(call) {
        // Add to transcript
        addToTranscript('system', 'Call disconnected');
        
        // Clear active call
        activeCall = null;
    }
    
    // Handle call summary event
    function handleCallSummary(summary) {
        console.log('Call summary received:', summary);
        
        // Update UI with summary if needed
        const summaryElement = document.getElementById('callSummary');
        if (summaryElement) {
            summaryElement.textContent = summary.summary;
        }
    }
    
    // Handle transcription event
    function handleTranscription(transcription) {
        console.log('Transcription received:', transcription);
        
        // Add to transcript
        if (transcription.speaker === 'client') {
            addToTranscript('client', transcription.text);
            
            // Process client input if ElevenLabs is available
            if (typeof ElevenLabsIntegration !== 'undefined') {
                processClientInput(transcription.text);
            }
        } else {
            addToTranscript('agent', transcription.text);
        }
    }
    
    // Add item to transcript
    function addToTranscript(speaker, text) {
        const timestamp = new Date();
        
        const transcriptItem = {
            id: Date.now(),
            speaker,
            text,
            timestamp
        };
        
        transcriptItems.push(transcriptItem);
        
        // Update UI with transcript item
        updateTranscriptDisplay(transcriptItem);
        
        return transcriptItem;
    }
    
    // Update transcript display in UI
    function updateTranscriptDisplay(item) {
        const transcriptElement = document.getElementById('liveTranscription');
        if (!transcriptElement) return;
        
        const speakerLabel = item.speaker === 'agent' ? 'Agent' : 
                            item.speaker === 'client' ? 'Client' : 'System';
        
        const newElement = document.createElement('p');
        newElement.innerHTML = `<strong>${speakerLabel}:</strong> ${item.text}`;
        
        // Add CSS class based on speaker
        newElement.classList.add(`transcript-${item.speaker}`);
        
        transcriptElement.appendChild(newElement);
        
        // Scroll to bottom
        transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
    
    // Process client input and generate response
    function processClientInput(text) {
        console.log('Processing client input:', text);
        
        // For demo purposes, we'll use simple keyword matching
        // In a real implementation, this would use NLP or AI to understand intent
        
        const lowerText = text.toLowerCase();
        let response = '';
        
        if (lowerText.includes('appointment') || lowerText.includes('schedule')) {
            response = "I'd be happy to help you schedule an appointment. What date and time works best for you?";
        } else if (lowerText.includes('document') || lowerText.includes('notarize')) {
            response = "For notarizing documents, you'll need to bring a valid government-issued ID and the unsigned documents. What type of document do you need notarized?";
        } else if (lowerText.includes('cost') || lowerText.includes('fee') || lowerText.includes('price')) {
            response = "Our standard notary fee is $15 per signature. If you need mobile notary services, there's an additional travel fee based on your location.";
        } else if (lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('office')) {
            response = "Our main office is located at 123 Notary Street, Suite 101, in downtown. We also offer mobile notary services where we can come to your location.";
        } else if (lowerText.includes('id') || lowerText.includes('identification')) {
            response = "You'll need a valid government-issued photo ID such as a driver's license, passport, or state ID card. The name on your ID must match the name on the documents.";
        } else if (lowerText.includes('thank')) {
            response = "You're welcome! Is there anything else I can help you with today?";
        } else if (lowerText.includes('goodbye') || lowerText.includes('bye')) {
            response = "Thank you for contacting our notary service. Have a great day!";
        } else {
            response = "I'm here to help with your notary needs. I can provide information about our services, scheduling appointments, document requirements, or fees. What would you like to know?";
        }
        
        // Speak the response
        setTimeout(() => {
            ElevenLabsIntegration.speak(response);
            addToTranscript('agent', response);
        }, 1000);
    }
    
    // Start a call
    function startCall(phoneNumber, options = {}) {
        console.log('NotaryVoiceAgent.startCall called with:', phoneNumber, options);
        
        if (!isInitialized) {
            console.error('NotaryVoiceAgent is not initialized');
            return false;
        }
        
        // Use Twilio to make the call
        const call = TwilioIntegration.startCall(phoneNumber, options);
        
        if (call) {
            activeCall = call;
            console.log('Call started successfully:', call);
            return call;
        } else {
            console.error('Failed to start call');
            return false;
        }
    }
    
    // End the current active call
    function endCall() {
        if (!activeCall) {
            console.warn('No active call to end');
            return false;
        }
        
        // Use Twilio to end the call
        const result = TwilioIntegration.endCall();
        
        if (result) {
            activeCall = null;
            return result;
        } else {
            return false;
        }
    }
    
    // Send a message
    function sendMessage(phoneNumber, message, options = {}) {
        if (!isInitialized) {
            console.error('NotaryVoiceAgent is not initialized');
            return false;
        }
        
        return TwilioIntegration.sendSMS(phoneNumber, message, options);
    }
    
    // Get active call information
    function getActiveCall() {
        return activeCall;
    }
    
    // Get transcript items
    function getTranscript() {
        return [...transcriptItems];
    }
    
    // Add agent event listener
    function addListener(listener) {
        if (typeof listener === 'function') {
            agentListeners.push(listener);
        }
    }
    
    // Remove agent event listener
    function removeListener(listener) {
        const index = agentListeners.indexOf(listener);
        if (index !== -1) {
            agentListeners.splice(index, 1);
        }
    }
    
    // Notify all agent listeners of an event
    function notifyAgentListeners(source, data) {
        agentListeners.forEach(listener => {
            try {
                listener(source, data);
            } catch (error) {
                console.error('Error in agent listener:', error);
            }
        });
    }
    
    // Public API
    return {
        init,
        startCall,
        endCall,
        sendMessage,
        getActiveCall,
        getTranscript,
        addListener,
        removeListener
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotaryVoiceAgent;
}