/**
 * ElevenLabs Integration for Notary Voice Agent
 * Handles voice AI functionality and integration with ElevenLabs services
 */

const ElevenLabsIntegration = (function() {
    // Configuration
    const config = {
        apiEndpoint: '/api/elevenlabs',
        ttsEndpoint: '/api/elevenlabs/tts',
        voiceEndpoint: '/api/elevenlabs/voice'
    };

    // Private variables
    let selectedVoice = 'agent-default';
    let audioContext = null;
    let audioQueue = [];
    let isPlaying = false;
    let isPaused = false;
    let listeners = [];
    
    // Available voices
    const voices = [
        { id: 'agent-default', name: 'Professional Agent (Default)', gender: 'female' },
        { id: 'agent-male', name: 'Professional Male Agent', gender: 'male' },
        { id: 'agent-friendly', name: 'Friendly Agent', gender: 'female' },
        { id: 'agent-formal', name: 'Formal Agent', gender: 'male' }
    ];
    
    // Initialize audio context
    function initAudioContext() {
        if (!audioContext) {
            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                console.log('Audio context initialized');
            } catch (error) {
                console.error('Error initializing audio context:', error);
            }
        }
        return audioContext;
    }
    
    // Get available voices
    function getVoices() {
        return [...voices];
    }
    
    // Set the voice to use
    function setVoice(voiceId) {
        const voice = voices.find(v => v.id === voiceId);
        if (voice) {
            selectedVoice = voiceId;
            notifyListeners('voiceChanged', { voiceId, voice });
            return true;
        }
        return false;
    }
    
    // Get current voice
    function getCurrentVoice() {
        return voices.find(v => v.id === selectedVoice);
    }
    
    // Text to speech - mock implementation for demo
    function textToSpeech(text, options = {}) {
        console.log(`Converting text to speech: "${text}" using voice: ${options.voiceId || selectedVoice}`);
        
        // In a real implementation, this would make a call to the ElevenLabs API
        // For demo purposes, we'll use the browser's built-in speech synthesis
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Map voice to browser voice as best as possible
        const voiceId = options.voiceId || selectedVoice;
        const voice = voices.find(v => v.id === voiceId);
        
        if (voice) {
            // Try to find a matching browser voice
            const synVoices = window.speechSynthesis.getVoices();
            const preferredLang = 'en-US';
            
            // Choose a voice based on gender
            let selectedSynVoice = synVoices.find(v => 
                v.lang.startsWith('en') && 
                ((voice.gender === 'female' && v.name.includes('Female')) || 
                 (voice.gender === 'male' && v.name.includes('Male')))
            );
            
            // Fallback to any English voice
            if (!selectedSynVoice) {
                selectedSynVoice = synVoices.find(v => v.lang === preferredLang) || 
                                   synVoices.find(v => v.lang.startsWith('en')) ||
                                   synVoices[0];
            }
            
            if (selectedSynVoice) {
                utterance.voice = selectedSynVoice;
            }
        }
        
        // Set other properties
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume !== undefined ? options.volume : 1;
        
        // Events
        utterance.onstart = () => {
            isPlaying = true;
            notifyListeners('speechStart', { text });
        };
        
        utterance.onend = () => {
            isPlaying = false;
            notifyListeners('speechEnd', { text });
            
            // Process next in queue if exists
            if (audioQueue.length > 0 && !isPaused) {
                const next = audioQueue.shift();
                textToSpeech(next.text, next.options);
            }
        };
        
        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            isPlaying = false;
            notifyListeners('speechError', { text, error });
        };
        
        // Start speaking or add to queue
        if (!isPlaying && !isPaused) {
            window.speechSynthesis.speak(utterance);
        } else {
            audioQueue.push({ text, options });
        }
        
        return {
            id: `speech-${Date.now()}`,
            text,
            status: isPlaying ? 'playing' : 'queued'
        };
    }
    
    // Generate AI response
    function generateResponse(input, context = {}) {
        console.log(`Generating AI response for: "${input}"`);
        
        // In a real implementation, this would make a call to the backend
        // which would use ElevenLabs or another AI service to generate a response
        
        // Mock implementation for demo
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock responses based on keywords in the input
                let response = '';
                
                if (input.toLowerCase().includes('hello') || input.toLowerCase().includes('hi')) {
                    response = "Hello! I'm your notary voice assistant. How can I help you today?";
                } else if (input.toLowerCase().includes('appointment') || input.toLowerCase().includes('schedule')) {
                    response = "I'd be happy to help you schedule an appointment. What date and time works best for you?";
                } else if (input.toLowerCase().includes('document') || input.toLowerCase().includes('papers')) {
                    response = "For your notary session, you'll need to bring the original documents, valid government-issued photo ID, and any other signers who need to be present.";
                } else if (input.toLowerCase().includes('cost') || input.toLowerCase().includes('fee') || input.toLowerCase().includes('price')) {
                    response = "Our standard notary fee is $15 per signature. If you need mobile notary services, there's an additional travel fee based on your location.";
                } else if (input.toLowerCase().includes('thank')) {
                    response = "You're welcome! Is there anything else I can help you with today?";
                } else {
                    response = "I understand you're looking for notary services. Could you provide more specific details about what you need?";
                }
                
                const result = {
                    id: `response-${Date.now()}`,
                    input,
                    response,
                    context
                };
                
                notifyListeners('responseGenerated', result);
                
                resolve(result);
            }, 1000); // Simulate API delay
        });
    }
    
    // Generate and speak response
    function generateAndSpeakResponse(input, context = {}) {
        return generateResponse(input, context)
            .then(result => {
                // Speak the response
                textToSpeech(result.response);
                return result;
            });
    }
    
    // Pause playback
    function pause() {
        if (isPlaying && !isPaused) {
            window.speechSynthesis.pause();
            isPaused = true;
            notifyListeners('paused', {});
            return true;
        }
        return false;
    }
    
    // Resume playback
    function resume() {
        if (isPaused) {
            window.speechSynthesis.resume();
            isPaused = false;
            notifyListeners('resumed', {});
            return true;
        }
        return false;
    }
    
    // Stop playback and clear queue
    function stop() {
        window.speechSynthesis.cancel();
        audioQueue = [];
        isPlaying = false;
        isPaused = false;
        notifyListeners('stopped', {});
        return true;
    }
    
    // Create a spoken dialog for a notary session
    function createNotarySessionDialog(sessionDetails = {}) {
        const greeting = `Hello ${sessionDetails.clientName || 'there'}, I'm your virtual notary assistant. I'll be guiding you through this notary session today.`;
        
        const instructions = `Before we begin, I need to verify your identity. Please hold your government-issued ID up to the camera.`;
        
        const confirmation = `Thank you. Now, I'll need you to confirm that you're signing this document voluntarily and that you understand its contents.`;
        
        const completion = `Great! We've completed all the necessary notarizations. You'll receive an email confirmation with the details and next steps. Is there anything else you need assistance with?`;
        
        return [greeting, instructions, confirmation, completion];
    }
    
    // Play a notary session dialog
    function playNotarySessionDialog(sessionDetails = {}) {
        const dialogSteps = createNotarySessionDialog(sessionDetails);
        
        // Clear any existing queue
        stop();
        
        // Add all steps to the queue
        dialogSteps.forEach(text => {
            audioQueue.push({ text, options: {} });
        });
        
        // Start playing
        if (audioQueue.length > 0) {
            const first = audioQueue.shift();
            textToSpeech(first.text, first.options);
        }
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
    
    // Initialize
    function init() {
        initAudioContext();
        
        // Load speech synthesis voices when available
        if (window.speechSynthesis) {
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    console.log('Speech synthesis voices loaded');
                };
            }
        }
    }
    
    // Initialize on script load
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', init);
    }
    
    // Public API
    return {
        getVoices,
        setVoice,
        getCurrentVoice,
        textToSpeech,
        generateResponse,
        generateAndSpeakResponse,
        pause,
        resume,
        stop,
        playNotarySessionDialog,
        addEventListener,
        removeEventListener
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevenLabsIntegration;
} 