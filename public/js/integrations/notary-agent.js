/**
 * Notary Voice Agent Integration
 * Combines Twilio and ElevenLabs integrations for a complete notary voice agent
 */

const NotaryVoiceAgent = (function() {
    // Configuration
    const config = {
        apiEndpoint: '/api/notary-agent',
        transcriptionEndpoint: '/api/notary-agent/transcription',
        summaryEndpoint: '/api/notary-agent/summary'
    };

    // Private variables
    let isInitialized = false;
    let listeners = [];
    
    // Transcript and summary data
    let currentCallTranscript = [];
    let currentCallSummary = null;
    let callTags = [];
    
    // Initialize the agent
    function init() {
        if (isInitialized) return;
        
        // Set up listeners for Twilio events
        if (window.TwilioIntegration) {
            TwilioIntegration.addCallListener(handleTwilioEvent);
        } else {
            console.error('Twilio integration not found');
        }
        
        // Set up listeners for ElevenLabs events
        if (window.ElevenLabsIntegration) {
            ElevenLabsIntegration.addEventListener(handleElevenLabsEvent);
        } else {
            console.error('ElevenLabs integration not found');
        }
        
        isInitialized = true;
        notifyListeners('initialized', {});
        
        return isInitialized;
    }
    
    // Handle Twilio events
    function handleTwilioEvent(event, data) {
        console.log(`Twilio event: ${event}`, data);
        
        switch (event) {
            case 'connected':
                // Call started
                resetCallData();
                notifyListeners('callStarted', data);
                
                // Start with a greeting
                if (window.ElevenLabsIntegration) {
                    setTimeout(() => {
                        const greeting = `Hello, this is your notary voice assistant. How can I help you today?`;
                        ElevenLabsIntegration.textToSpeech(greeting);
                        addToTranscript('agent', greeting);
                    }, 1000);
                }
                break;
                
            case 'disconnected':
                // Call ended
                notifyListeners('callEnded', data);
                break;
                
            case 'summary':
                // Call summary received
                currentCallSummary = data;
                callTags = data.tags || [];
                notifyListeners('callSummaryReceived', data);
                break;
        }
    }
    
    // Handle ElevenLabs events
    function handleElevenLabsEvent(event, data) {
        console.log(`ElevenLabs event: ${event}`, data);
        
        switch (event) {
            case 'speechStart':
                notifyListeners('agentSpeaking', data);
                break;
                
            case 'speechEnd':
                notifyListeners('agentFinishedSpeaking', data);
                break;
                
            case 'responseGenerated':
                // Add the AI response to the transcript
                addToTranscript('agent', data.response);
                notifyListeners('responseGenerated', data);
                break;
        }
    }
    
    // Reset call data
    function resetCallData() {
        currentCallTranscript = [];
        currentCallSummary = null;
        callTags = [];
    }
    
    // Add entry to transcript
    function addToTranscript(speaker, text) {
        const entry = {
            id: Date.now(),
            speaker,
            text,
            timestamp: new Date()
        };
        
        currentCallTranscript.push(entry);
        notifyListeners('transcriptUpdated', { entry, transcript: currentCallTranscript });
        
        return entry;
    }
    
    // Process user input
    function processUserInput(text) {
        // Add to transcript
        addToTranscript('client', text);
        
        // Process with ElevenLabs
        if (window.ElevenLabsIntegration) {
            return ElevenLabsIntegration.generateAndSpeakResponse(text, { 
                transcriptContext: currentCallTranscript
            });
        } else {
            console.error('ElevenLabs integration not found');
            return Promise.resolve(null);
        }
    }
    
    // Start a call
    function startCall(phoneNumber, options = {}) {
        if (window.TwilioIntegration) {
            return TwilioIntegration.startCall(phoneNumber, options);
        } else {
            console.error('Twilio integration not found');
            return null;
        }
    }
    
    // End the current call
    function endCall() {
        if (window.TwilioIntegration) {
            return TwilioIntegration.endCall();
        } else {
            console.error('Twilio integration not found');
            return null;
        }
    }
    
    // Get current call transcript
    function getTranscript() {
        return [...currentCallTranscript];
    }
    
    // Get current call summary
    function getSummary() {
        return currentCallSummary;
    }
    
    // Get call tags
    function getTags() {
        return [...callTags];
    }
    
    // Add a tag
    function addTag(tag) {
        if (tag && !callTags.includes(tag)) {
            callTags.push(tag);
            notifyListeners('tagsUpdated', { tags: callTags });
            return true;
        }
        return false;
    }
    
    // Remove a tag
    function removeTag(tag) {
        const index = callTags.indexOf(tag);
        if (index !== -1) {
            callTags.splice(index, 1);
            notifyListeners('tagsUpdated', { tags: callTags });
            return true;
        }
        return false;
    }
    
    // Generate an AI summary of the call
    function generateSummary() {
        if (currentCallTranscript.length === 0) {
            console.warn('No transcript available to generate summary');
            return Promise.resolve(null);
        }
        
        // In a real implementation, this would call the backend API
        // For demo, we'll generate a mock summary
        return new Promise((resolve) => {
            setTimeout(() => {
                const transcriptText = currentCallTranscript
                    .map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`)
                    .join('\n');
                
                console.log('Generating summary for transcript:', transcriptText);
                
                // Extract topics based on keywords in the transcript
                const topics = [];
                const keywordMap = {
                    'document': 'Document Verification',
                    'appointment': 'Appointment Scheduling',
                    'schedule': 'Appointment Scheduling',
                    'notarize': 'Notarization Services',
                    'notary': 'Notarization Services',
                    'sign': 'Document Signing',
                    'signature': 'Document Signing',
                    'id': 'Identity Verification',
                    'identification': 'Identity Verification',
                    'fee': 'Pricing Discussion',
                    'cost': 'Pricing Discussion',
                    'price': 'Pricing Discussion'
                };
                
                // Find topics based on keywords
                Object.keys(keywordMap).forEach(keyword => {
                    if (transcriptText.toLowerCase().includes(keyword) && !topics.includes(keywordMap[keyword])) {
                        topics.push(keywordMap[keyword]);
                    }
                });
                
                // Generate tags from topics
                const tags = topics.map(topic => topic.toLowerCase().replace(' ', '-'));
                
                // Add default topics if none found
                if (topics.length === 0) {
                    topics.push('General Inquiry');
                    tags.push('general-inquiry');
                }
                
                // Generate a summary based on transcript length
                let summary = '';
                if (currentCallTranscript.length <= 3) {
                    summary = 'Brief call with client discussing notary services.';
                } else {
                    summary = `Call with client discussing ${topics.join(', ')}. `;
                    
                    // Add details based on topics
                    if (topics.includes('Appointment Scheduling')) {
                        summary += 'Client inquired about scheduling a notary appointment. ';
                    }
                    
                    if (topics.includes('Document Verification') || topics.includes('Notarization Services')) {
                        summary += 'Discussed document requirements and notarization process. ';
                    }
                    
                    if (topics.includes('Pricing Discussion')) {
                        summary += 'Provided information about notary service fees. ';
                    }
                    
                    // Add closing
                    summary += 'Client was provided with all requested information.';
                }
                
                // Create summary object
                currentCallSummary = {
                    id: `summary-${Date.now()}`,
                    date: new Date(),
                    duration: currentCallTranscript.length > 0 ? 
                        Math.floor((Date.now() - currentCallTranscript[0].timestamp) / 1000) : 0,
                    topics,
                    summary,
                    tags,
                    nextSteps: ['Follow up with client', 'Send confirmation email']
                };
                
                // Update tags
                callTags = [...tags];
                
                // Notify listeners
                notifyListeners('summaryGenerated', currentCallSummary);
                
                resolve(currentCallSummary);
            }, 1500);
        });
    }
    
    // Add event listener
    function addEventListener(listener) {
        if (typeof listener === 'function') {
            listeners.push(listener);
        }
    }
    
    // Remove event listener
    function removeEventListener(listener) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
    
    // Notify all listeners of an event
    function notifyListeners(event, data) {
        listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }
    
    // Check if agent is initialized
    function isAgentInitialized() {
        return isInitialized;
    }
    
    // Public API
    return {
        init,
        startCall,
        endCall,
        processUserInput,
        getTranscript,
        getSummary,
        getTags,
        addTag,
        removeTag,
        generateSummary,
        addEventListener,
        removeEventListener,
        isInitialized: isAgentInitialized
    };
})();

// Initialize on script load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        // Delay initialization to ensure other scripts are loaded
        setTimeout(function() {
            if (NotaryVoiceAgent && !NotaryVoiceAgent.isInitialized()) {
                NotaryVoiceAgent.init();
            }
        }, 500);
    });
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotaryVoiceAgent;
} 