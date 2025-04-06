/**
 * Calls Management JavaScript for Notary Voice Agent Dashboard
 * Handles call interactions, display, and functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const activeCallCard = document.getElementById('activeCallCard');
    const noActiveCallCard = document.getElementById('noActiveCallCard');
    const newCallBtn = document.getElementById('newCallBtn');
    const hangupBtn = document.getElementById('hangupBtn');
    const muteBtn = document.getElementById('muteBtn');
    const activeCallName = document.getElementById('activeCallName');
    const activeCallNumber = document.getElementById('activeCallNumber');
    const activeCallDuration = document.getElementById('activeCallDuration');
    const liveTranscription = document.getElementById('liveTranscription');
    const callHistoryTable = document.getElementById('callHistoryTable');
    const recordingSwitch = document.getElementById('recordingSwitch');
    const transcriptionSwitch = document.getElementById('transcriptionSwitch');
    const summarySwitch = document.getElementById('summarySwitch');
    
    // Call Modal Elements
    const makeCallModal = new bootstrap.Modal(document.getElementById('makeCallModal'));
    const callForm = document.getElementById('callForm');
    const callClientSelect = document.getElementById('callClientSelect');
    const callPhone = document.getElementById('callPhone');
    const startCallBtn = document.getElementById('startCallBtn');
    
    // Call Details Modal Elements
    const callDetailsModal = new bootstrap.Modal(document.getElementById('callDetailsModal'));
    const detailsClientName = document.getElementById('detailsClientName');
    const detailsClientPhone = document.getElementById('detailsClientPhone');
    const detailsClientEmail = document.getElementById('detailsClientEmail');
    const detailsCallDate = document.getElementById('detailsCallDate');
    const detailsCallDuration = document.getElementById('detailsCallDuration');
    const detailsCallStatus = document.getElementById('detailsCallStatus');
    const detailsCallRecording = document.getElementById('detailsCallRecording');
    const detailsCallTranscript = document.getElementById('detailsCallTranscript');
    const detailsCallSummary = document.getElementById('detailsCallSummary');
    
    // Check for integrations
    const hasTwilioIntegration = typeof TwilioIntegration !== 'undefined';
    const hasElevenLabsIntegration = typeof ElevenLabsIntegration !== 'undefined';
    const hasNotaryVoiceAgent = typeof NotaryVoiceAgent !== 'undefined';
    
    // Sample client data for select population
    const sampleClients = [
        { id: 1, name: 'John Smith', phone: '(555) 123-4567', email: 'john.smith@example.com' },
        { id: 2, name: 'Jane Doe', phone: '(555) 987-6543', email: 'jane.doe@example.com' },
        { id: 3, name: 'Robert Johnson', phone: '(555) 555-5555', email: 'robert.j@example.com' }
    ];
    
    // Initialize page
    function init() {
        // Initialize NotaryVoiceAgent if available
        if (hasNotaryVoiceAgent && !NotaryVoiceAgent.isInitialized()) {
            NotaryVoiceAgent.init();
            NotaryVoiceAgent.addEventListener(handleNotaryAgentEvent);
        }
        
        // Populate client dropdown
        populateClientSelect();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load call history
        loadCallHistory();
        
        // Check for active call
        updateCallDisplay();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // New call button
        if (newCallBtn) {
            newCallBtn.addEventListener('click', function() {
                makeCallModal.show();
            });
        }
        
        // Hangup button
        if (hangupBtn) {
            hangupBtn.addEventListener('click', function() {
                endCurrentCall();
            });
        }
        
        // Mute button
        if (muteBtn) {
            muteBtn.addEventListener('click', function() {
                toggleMute();
            });
        }
        
        // Start call button
        if (startCallBtn) {
            startCallBtn.addEventListener('click', function() {
                initiateCall();
            });
        }
        
        // Refresh button
        const refreshCallsData = document.getElementById('refreshCallsData');
        if (refreshCallsData) {
            refreshCallsData.addEventListener('click', function() {
                loadCallHistory();
            });
        }
        
        // Call form submission
        if (callForm) {
            callForm.addEventListener('submit', function(e) {
                e.preventDefault();
                initiateCall();
            });
        }
    }
    
    // Populate client select dropdown
    function populateClientSelect() {
        if (callClientSelect) {
            callClientSelect.innerHTML = '<option value="">Select a client</option>';
            
            sampleClients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                option.dataset.phone = client.phone;
                option.dataset.email = client.email;
                callClientSelect.appendChild(option);
            });
            
            // Add event listener for client selection
            callClientSelect.addEventListener('change', function() {
                const selectedOption = callClientSelect.options[callClientSelect.selectedIndex];
                if (selectedOption.dataset.phone) {
                    callPhone.value = selectedOption.dataset.phone;
                }
            });
        }
    }
    
    // Update call display based on active call
    function updateCallDisplay() {
        const hasActiveCall = hasTwilioIntegration && TwilioIntegration.hasActiveCall();
        
        if (activeCallCard) {
            activeCallCard.style.display = hasActiveCall ? 'block' : 'none';
        }
        
        if (noActiveCallCard) {
            noActiveCallCard.style.display = hasActiveCall ? 'none' : 'block';
        }
        
        if (hasActiveCall) {
            const activeCall = TwilioIntegration.getActiveCall();
            updateActiveCallInfo(activeCall);
        }
    }
    
    // Update active call information
    function updateActiveCallInfo(call) {
        if (!call) return;
        
        // Find client info based on phone number
        const client = sampleClients.find(c => c.phone === call.to) || {
            name: 'Unknown Client',
            phone: call.to,
            email: 'unknown@example.com'
        };
        
        if (activeCallName) {
            activeCallName.textContent = client.name;
        }
        
        if (activeCallNumber) {
            activeCallNumber.textContent = client.phone;
        }
    }
    
    // Initiate a call
    function initiateCall() {
        if (!hasTwilioIntegration) {
            alert('Twilio integration is not available');
            return;
        }
        
        const phoneNumber = callPhone.value.trim();
        if (!phoneNumber) {
            alert('Please enter a phone number');
            return;
        }
        
        const options = {
            recording: recordingSwitch ? recordingSwitch.checked : true,
            transcription: transcriptionSwitch ? transcriptionSwitch.checked : true
        };
        
        // Find client info
        const selectedClientId = callClientSelect.value;
        let clientName = 'Unknown Client';
        
        if (selectedClientId) {
            const client = sampleClients.find(c => c.id == selectedClientId);
            if (client) {
                clientName = client.name;
            }
        }
        
        // Start call
        const call = hasNotaryVoiceAgent ? 
            NotaryVoiceAgent.startCall(phoneNumber, options) : 
            TwilioIntegration.startCall(phoneNumber, options);
        
        if (call) {
            // Hide modal
            makeCallModal.hide();
            
            // Update display
            updateCallDisplay();
            
            // Reset transcript display
            if (liveTranscription) {
                liveTranscription.innerHTML = '';
            }
        } else {
            alert('Failed to initiate call. Please try again.');
        }
    }
    
    // End the current call
    function endCurrentCall() {
        if (hasNotaryVoiceAgent) {
            NotaryVoiceAgent.endCall();
        } else if (hasTwilioIntegration) {
            TwilioIntegration.endCall();
        }
        
        updateCallDisplay();
    }
    
    // Toggle mute
    function toggleMute() {
        const isMuted = muteBtn.querySelector('i').classList.contains('fa-microphone');
        
        if (isMuted) {
            muteBtn.querySelector('i').classList.remove('fa-microphone');
            muteBtn.querySelector('i').classList.add('fa-microphone-slash');
            muteBtn.textContent = ' Unmute';
            muteBtn.prepend(document.createElement('i').classList.add('fas', 'fa-microphone-slash'));
        } else {
            muteBtn.querySelector('i').classList.remove('fa-microphone-slash');
            muteBtn.querySelector('i').classList.add('fa-microphone');
            muteBtn.textContent = ' Mute';
            muteBtn.prepend(document.createElement('i').classList.add('fas', 'fa-microphone'));
        }
        
        // In a real implementation, this would mute the call
        console.log('Call muted:', !isMuted);
    }
    
    // Handle Notary Voice Agent events
    function handleNotaryAgentEvent(event, data) {
        console.log(`NotaryVoiceAgent event: ${event}`, data);
        
        switch (event) {
            case 'callStarted':
                updateCallDisplay();
                break;
                
            case 'callEnded':
                updateCallDisplay();
                // Refresh call history
                setTimeout(loadCallHistory, 1000);
                break;
                
            case 'transcriptUpdated':
                updateTranscriptDisplay(data.entry);
                break;
                
            case 'callSummaryReceived':
                // Show call summary notification
                showNotification('Call Summary Generated', 'The AI has generated a summary for this call.');
                break;
        }
    }
    
    // Update transcript display
    function updateTranscriptDisplay(entry) {
        if (!liveTranscription || !entry) return;
        
        const p = document.createElement('p');
        p.innerHTML = `<strong>${entry.speaker === 'agent' ? 'Agent' : 'Client'}:</strong> ${entry.text}`;
        liveTranscription.appendChild(p);
        
        // Scroll to bottom
        liveTranscription.scrollTop = liveTranscription.scrollHeight;
    }
    
    // Load call history
    function loadCallHistory() {
        if (!callHistoryTable) return;
        
        const tbody = callHistoryTable.querySelector('tbody');
        if (!tbody) return;
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Get call history
        let callHistory = [];
        
        if (hasNotaryVoiceAgent) {
            // In a real implementation, this would get call history from the API
            callHistory = TwilioIntegration.getCallHistory();
        } else if (hasTwilioIntegration) {
            callHistory = TwilioIntegration.getCallHistory();
        }
        
        // If no history or empty, add sample data
        if (!callHistory || callHistory.length === 0) {
            callHistory = [
                {
                    id: 'sample-call-1',
                    to: '(555) 123-4567',
                    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                    duration: 325, // 5:25
                    status: 'completed',
                    type: 'outgoing'
                },
                {
                    id: 'sample-call-2',
                    to: '(555) 987-6543',
                    startTime: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1.5 days ago
                    duration: 187, // 3:07
                    status: 'completed',
                    type: 'incoming'
                }
            ];
        }
        
        // Populate table
        callHistory.forEach(call => {
            // Find client info
            const client = sampleClients.find(c => c.phone === call.to) || {
                name: 'Unknown Client',
                phone: call.to
            };
            
            // Format date
            const date = new Date(call.startTime);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            // Format duration
            const hours = Math.floor(call.duration / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((call.duration % 3600) / 60).toString().padStart(2, '0');
            const seconds = (call.duration % 60).toString().padStart(2, '0');
            const formattedDuration = `${hours === '00' ? '' : hours + ':'}${minutes}:${seconds}`;
            
            // Create row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.name}</td>
                <td>${formattedDate}</td>
                <td>${formattedDuration}</td>
                <td>${call.type || 'outgoing'}</td>
                <td><span class="badge bg-success">${call.status || 'completed'}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary view-call" data-id="${call.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success call-client" data-number="${call.to}">
                            <i class="fas fa-phone"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to buttons
        addCallHistoryButtonListeners();
    }
    
    // Add event listeners to call history buttons
    function addCallHistoryButtonListeners() {
        // View call buttons
        document.querySelectorAll('.view-call').forEach(button => {
            button.addEventListener('click', function() {
                const callId = this.getAttribute('data-id');
                viewCallDetails(callId);
            });
        });
        
        // Call client buttons
        document.querySelectorAll('.call-client').forEach(button => {
            button.addEventListener('click', function() {
                const phoneNumber = this.getAttribute('data-number');
                callPhone.value = phoneNumber;
                makeCallModal.show();
            });
        });
    }
    
    // View call details
    function viewCallDetails(callId) {
        let callData = null;
        let callSummary = null;
        
        // Get call data
        if (hasTwilioIntegration) {
            const callHistory = TwilioIntegration.getCallHistory();
            callData = callHistory.find(call => call.id === callId);
            
            if (callData) {
                callSummary = TwilioIntegration.getCallSummary(callId);
            }
        }
        
        // If no data, use sample data
        if (!callData) {
            callData = {
                id: callId,
                to: '(555) 123-4567',
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
                duration: 325,
                status: 'completed',
                type: 'outgoing'
            };
            
            callSummary = {
                callId: callId,
                topics: ['Document Verification', 'Appointment Scheduling'],
                summary: 'Client called to schedule a notary appointment for mortgage documents. Verified required documents and scheduled for next Tuesday at 2 PM.',
                tags: ['mortgage', 'appointment', 'document-verification'],
                nextSteps: ['Send confirmation email', 'Prepare documents', 'Send reminder']
            };
        }
        
        // Find client info
        const client = sampleClients.find(c => c.phone === callData.to) || {
            name: 'Unknown Client',
            phone: callData.to,
            email: 'unknown@example.com'
        };
        
        // Set client info
        if (detailsClientName) detailsClientName.textContent = client.name;
        if (detailsClientPhone) detailsClientPhone.textContent = client.phone;
        if (detailsClientEmail) detailsClientEmail.textContent = client.email;
        
        // Set call info
        if (detailsCallDate) {
            const date = new Date(callData.startTime);
            detailsCallDate.textContent = `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        if (detailsCallDuration) {
            const hours = Math.floor(callData.duration / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((callData.duration % 3600) / 60).toString().padStart(2, '0');
            const seconds = (callData.duration % 60).toString().padStart(2, '0');
            detailsCallDuration.textContent = `${hours === '00' ? '' : hours + ':'}${minutes}:${seconds}`;
        }
        
        if (detailsCallStatus) {
            detailsCallStatus.textContent = callData.status || 'Completed';
        }
        
        // Set transcript
        if (detailsCallTranscript) {
            // In a real implementation, this would fetch the transcript from the API
            detailsCallTranscript.innerHTML = `
                <p><strong>Agent:</strong> Hello, this is Notary Voice Agent. How can I help you today?</p>
                <p><strong>Client:</strong> Hi, I need to schedule a notary session for my mortgage documents.</p>
                <p><strong>Agent:</strong> I'd be happy to help you schedule that. What day and time works best for you?</p>
                <p><strong>Client:</strong> Would next Tuesday at 2 PM work?</p>
                <p><strong>Agent:</strong> Yes, Tuesday at 2 PM works. What documents will you need notarized?</p>
                <p><strong>Client:</strong> It's for a mortgage refinance, about 10 documents in total.</p>
                <p><strong>Agent:</strong> Perfect. Please bring all documents and a valid photo ID. Is there anything else you need help with?</p>
                <p><strong>Client:</strong> No, that's all. Thank you for your help.</p>
                <p><strong>Agent:</strong> You're welcome. We'll see you next Tuesday at 2 PM. Have a great day!</p>
            `;
        }
        
        // Set summary
        if (detailsCallSummary && callSummary) {
            detailsCallSummary.innerHTML = `
                <p>${callSummary.summary}</p>
                <div class="mt-3">
                    <strong>Topics:</strong>
                    <ul class="mb-2">
                        ${callSummary.topics.map(topic => `<li>${topic}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <strong>Tags:</strong>
                    <div class="mb-2">
                        ${callSummary.tags.map(tag => `<span class="badge bg-info me-1">${tag}</span>`).join('')}
                    </div>
                </div>
                <div>
                    <strong>Next Steps:</strong>
                    <ul>
                        ${callSummary.nextSteps.map(step => `<li>${step}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Show modal
        callDetailsModal.show();
    }
    
    // Show notification
    function showNotification(title, message) {
        // Check if browser supports notifications
        if ('Notification' in window) {
            // Check if permission is granted
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '/favicon.ico'
                });
            } else if (Notification.permission !== 'denied') {
                // Request permission
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: '/favicon.ico'
                        });
                    }
                });
            }
        }
    }
    
    // Initialize on page load
    init();
}); 