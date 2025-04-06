/**
 * ElevenLabs Integration for Notary Voice Agent
 * Handles Text-to-Speech functionality and integration with ElevenLabs API
 */

const ElevenLabsIntegration = (function() {
    // Configuration
    const config = {
        apiEndpoint: '/api/elevenlabs',
        voiceId: 'rachel', // Default voice ID
        modelId: 'eleven_monolingual_v1',
        stability: 0.5,
        similarityBoost: 0.75
    };

    // Private variables
    let isInitialized = false;
    let isSpeaking = false;
    let audioQueue = [];
    let audioElement = null;
    let currentAudio = null;
    let listeners = [];
    
    // Voice options
    const voices = [
        { id: 'rachel', name: 'Rachel', description: 'Professional female voice' },
        { id: 'dave', name: 'Dave', description: 'Professional male voice' },
        { id: 'sarah', name: 'Sarah', description: 'Friendly female voice' },
        { id: 'michael', name: 'Michael', description: 'Friendly male voice' }
    ];
    
    // Initialize the integration
    function init() {
        console.log('Initializing ElevenLabsIntegration...');
        
        try {
            // Create audio element if it doesn't exist
            if (!audioElement) {
                audioElement = document.createElement('audio');
                audioElement.setAttribute('id', 'elevenlabs-audio');
                audioElement.style.display = 'none';
                document.body.appendChild(audioElement);
                
                // Add event listeners
                audioElement.addEventListener('ended', handleAudioEnded);
                audioElement.addEventListener('error', handleAudioError);
                audioElement.addEventListener('play', () => {
                    isSpeaking = true;
                    notifyListeners('speechStart', { audio: currentAudio });
                });
                audioElement.addEventListener('pause', () => {
                    isSpeaking = false;
                    notifyListeners('speechPause', { audio: currentAudio });
                });
            }
            
            isInitialized = true;
            console.log('ElevenLabsIntegration initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing ElevenLabsIntegration:', error);
            return false;
        }
    }
    
    // Handle audio ended event
    function handleAudioEnded() {
        console.log('Audio playback ended');
        
        isSpeaking = false;
        notifyListeners('speechEnd', { audio: currentAudio });
        
        // Play next audio in queue if any
        if (audioQueue.length > 0) {
            playNextAudio();
        } else {
            currentAudio = null;
        }
    }
    
    // Handle audio error event
    function handleAudioError(error) {
        console.error('Audio playback error:', error);
        
        isSpeaking = false;
        notifyListeners('speechError', { error, audio: currentAudio });
        
        // Try to play next audio in queue
        if (audioQueue.length > 0) {
            playNextAudio();
        } else {
            currentAudio = null;
        }
    }
    
    // Play next audio in queue
    function playNextAudio() {
        if (audioQueue.length === 0 || !audioElement) return;
        
        currentAudio = audioQueue.shift();
        
        // Set audio source
        if (currentAudio.url) {
            // Play from URL
            audioElement.src = currentAudio.url;
        } else if (currentAudio.blob) {
            // Play from Blob
            audioElement.src = URL.createObjectURL(currentAudio.blob);
        } else {
            console.error('Invalid audio source');
            handleAudioError({ message: 'Invalid audio source' });
            return;
        }
        
        // Play audio
        const playPromise = audioElement.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing audio:', error);
                handleAudioError(error);
            });
        }
    }
    
    // Convert text to speech
    function textToSpeech(text, options = {}) {
        if (!isInitialized) {
            console.error('ElevenLabsIntegration is not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        
        console.log('Converting text to speech:', text);
        
        // In a real implementation, this would call the ElevenLabs API
        // For demo purposes, we'll simulate the API call
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    // Create a mock audio object
                    const audioId = `audio-${Date.now()}`;
                    const mockUrl = `mock-audio-url-${audioId}`;
                    
                    const audio = {
                        id: audioId,
                        text: text,
                        voiceId: options.voiceId || config.voiceId,
                        url: mockUrl,
                        blob: null, // In a real implementation, this would be the audio blob
                        timestamp: new Date()
                    };
                    
                    console.log('Text to speech conversion successful:', audio);
                    
                    notifyListeners('textToSpeechComplete', { audio });
                    
                    resolve(audio);
                } catch (error) {
                    console.error('Error in text to speech conversion:', error);
                    reject(error);
                }
            }, 300); // Simulate API delay
        });
    }
    
    // Speak the given text (convert to speech and play)
    function speak(text, options = {}) {
        if (!text) return Promise.resolve(null);
        
        return textToSpeech(text, options)
            .then(audio => {
                // For demo purposes, we'll simulate audio playback
                // In a real implementation, this would play the actual audio
                
                // Create a mock blob for demo
                const mockBlob = new Blob(['mock audio data'], { type: 'audio/mpeg' });
                audio.blob = mockBlob;
                
                // Add to queue
                audioQueue.push(audio);
                
                // Start playback if not already speaking
                if (!isSpeaking) {
                    playNextAudio();
                }
                
                return audio;
            })
            .catch(error => {
                console.error('Error in speak function:', error);
                return null;
            });
    }
    
    // Stop speaking
    function stopSpeaking() {
        if (!audioElement) return;
        
        try {
            audioElement.pause();
            audioElement.currentTime = 0;
            
            isSpeaking = false;
            audioQueue = [];
            currentAudio = null;
            
            notifyListeners('speechStopped', {});
            
            return true;
        } catch (error) {
            console.error('Error stopping speech:', error);
            return false;
        }
    }
    
    // Pause speaking
    function pauseSpeaking() {
        if (!audioElement || !isSpeaking) return false;
        
        try {
            audioElement.pause();
            return true;
        } catch (error) {
            console.error('Error pausing speech:', error);
            return false;
        }
    }
    
    // Resume speaking
    function resumeSpeaking() {
        if (!audioElement || isSpeaking) return false;
        
        try {
            audioElement.play();
            return true;
        } catch (error) {
            console.error('Error resuming speech:', error);
            return false;
        }
    }
    
    // Get available voices
    function getVoices() {
        return [...voices];
    }
    
    // Set voice by ID
    function setVoice(voiceId) {
        if (voices.some(voice => voice.id === voiceId)) {
            config.voiceId = voiceId;
            return true;
        }
        return false;
    }
    
    // Generate and speak an AI response to user input
    function generateResponse(userInput, options = {}) {
        console.log('Generating response for user input:', userInput);
        
        // In a real implementation, this would call an AI model to generate a response
        // For demo purposes, we'll use a simple response generator
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const response = generateMockResponse(userInput);
                    
                    notifyListeners('responseGenerated', { 
                        userInput, 
                        response,
                        options
                    });
                    
                    resolve(response);
                } catch (error) {
                    console.error('Error generating response:', error);
                    reject(error);
                }
            }, 500); // Simulate AI response delay
        });
    }
    
    // Generate a mock response based on keywords in the user input
    function generateMockResponse(input) {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.includes('appointment') || lowerInput.includes('schedule')) {
            return "I'd be happy to help you schedule an appointment. What date and time works best for you?";
        } else if (lowerInput.includes('document') || lowerInput.includes('notarize')) {
            return "For notarizing documents, you'll need a valid government-issued ID and the unsigned documents. What type of document do you need notarized?";
        } else if (lowerInput.includes('cost') || lowerInput.includes('fee') || lowerInput.includes('price')) {
            return "Our standard notary fee is $15 per signature. If you need mobile notary services, there's an additional travel fee based on your location.";
        } else if (lowerInput.includes('location') || lowerInput.includes('address')) {
            return "Our main office is located at 123 Notary Street, Suite 101, in downtown. We also offer mobile notary services where we can come to your location.";
        } else if (lowerInput.includes('thank')) {
            return "You're welcome! Is there anything else I can help you with today?";
        } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
            return "Thank you for contacting our notary service. Have a great day!";
        } else {
            return "I'm here to help with your notary needs. I can provide information about our services, scheduling appointments, document requirements, or fees. What would you like to know?";
        }
    }
    
    // Generate response and speak it
    function generateAndSpeakResponse(userInput, options = {}) {
        return generateResponse(userInput, options)
            .then(response => {
                return speak(response, options);
            });
    }
    
    // Add event listener
    function addListener(listener) {
        if (typeof listener === 'function') {
            listeners.push(listener);
        }
    }
    
    // Remove event listener
    function removeListener(listener) {
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
    
    // Public API
    return {
        init,
        textToSpeech,
        speak,
        stopSpeaking,
        pauseSpeaking,
        resumeSpeaking,
        getVoices,
        setVoice,
        generateResponse,
        generateAndSpeakResponse,
        addListener,
        removeListener
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevenLabsIntegration;
} 