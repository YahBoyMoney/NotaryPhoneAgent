/**
 * Call Management module for Notary Voice Agent frontend
 * Handles call UI interactions and API communications
 */

// Call state variables
let activeCall = null;
let callTimer = null;
let callDuration = 0;
let isMuted = false;
let callHistory = [];
let currentPage = 1;
let totalPages = 3; // Mock value for demo

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!Auth.checkAuthAndRedirect()) return;
    
    // Initialize page
    initCallsPage();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize calls page by loading data and updating UI
 */
function initCallsPage() {
    // Load call history
    loadCallHistory();
    
    // Load client list for dropdowns
    loadClientList();
    
    // Check for active call (demo purposes only - in real app would check with backend)
    checkForActiveCall();
}

/**
 * Set up event listeners for buttons and forms
 */
function setupEventListeners() {
    // New call button
    const newCallBtn = document.getElementById('newCallBtn');
    if (newCallBtn) {
        newCallBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('makeCallModal'));
            modal.show();
        });
    }
    
    // Start call button in modal
    const startCallBtn = document.getElementById('startCallBtn');
    if (startCallBtn) {
        startCallBtn.addEventListener('click', handleStartCall);
    }
    
    // Hangup button
    const hangupBtn = document.getElementById('hangupBtn');
    if (hangupBtn) {
        hangupBtn.addEventListener('click', handleEndCall);
    }
    
    // Mute button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', handleToggleMute);
    }
    
    // Feature switches
    const recordingSwitch = document.getElementById('recordingSwitch');
    const transcriptionSwitch = document.getElementById('transcriptionSwitch');
    const summarySwitch = document.getElementById('summarySwitch');
    
    if (recordingSwitch) {
        recordingSwitch.addEventListener('change', function() {
            console.log('Recording', this.checked ? 'enabled' : 'disabled');
        });
    }
    
    if (transcriptionSwitch) {
        transcriptionSwitch.addEventListener('change', function() {
            console.log('Transcription', this.checked ? 'enabled' : 'disabled');
        });
    }
    
    if (summarySwitch) {
        summarySwitch.addEventListener('change', function() {
            console.log('Call Summary', this.checked ? 'enabled' : 'disabled');
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshCallsData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadCallHistory();
            showToast('Call history refreshed');
        });
    }
    
    // Search button
    const searchBtn = document.getElementById('callSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('callSearchInput');
            if (searchInput) {
                searchCallHistory(searchInput.value);
            }
        });
    }
    
    // Search input (search on Enter key)
    const searchInput = document.getElementById('callSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCallHistory(this.value);
            }
        });
    }
    
    // Pagination
    setupPagination();
}

/**
 * Load call history from API
 */
async function loadCallHistory() {
    try {
        // Simulated data for now - replace with actual API call
        // const response = await fetch(CONFIG.getApiUrl(`calls?page=${currentPage}`), {
        //     headers: { ...Auth.authHeader() }
        // });
        // const data = await response.json();
        
        // Simulated data
        const data = {
            calls: [
                { id: 1, client: 'John Smith', date: 'April 4, 2023 at 2:30 PM', duration: '12:45', type: 'outgoing', status: 'completed' },
                { id: 2, client: 'Sarah Johnson', date: 'April 3, 2023 at 10:15 AM', duration: '8:20', type: 'incoming', status: 'completed' },
                { id: 3, client: 'Michael Brown', date: 'April 2, 2023 at 4:00 PM', duration: '15:30', type: 'outgoing', status: 'completed' },
                { id: 4, client: 'Emily Davis', date: 'April 1, 2023 at 9:45 AM', duration: '5:10', type: 'incoming', status: 'missed' },
                { id: 5, client: 'David Wilson', date: 'March 31, 2023 at 3:15 PM', duration: '10:35', type: 'outgoing', status: 'completed' }
            ],
            totalPages: 3,
            currentPage: currentPage
        };
        
        // Update state
        callHistory = data.calls;
        totalPages = data.totalPages;
        
        // Update UI
        updateCallHistoryTable();
        updatePagination();
    } catch (error) {
        console.error('Error loading call history:', error);
        showToast('Failed to load call history', 'error');
    }
}

/**
 * Load client list for dropdowns
 */
async function loadClientList() {
    try {
        // Simulated data for now - replace with actual API call
        // const response = await fetch(CONFIG.getApiUrl('clients'), {
        //     headers: { ...Auth.authHeader() }
        // });
        // const data = await response.json();
        
        // Simulated data
        const data = [
            { id: 1, name: 'John Smith', phone: '(555) 123-4567' },
            { id: 2, name: 'Sarah Johnson', phone: '(555) 234-5678' },
            { id: 3, name: 'Michael Brown', phone: '(555) 345-6789' },
            { id: 4, name: 'Emily Davis', phone: '(555) 456-7890' },
            { id: 5, name: 'David Wilson', phone: '(555) 567-8901' }
        ];
        
        // Update call client dropdown
        const callClientSelect = document.getElementById('callClientSelect');
        if (callClientSelect) {
            callClientSelect.innerHTML = '<option value="">Select a client</option>';
            
            data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                option.dataset.phone = client.phone;
                callClientSelect.appendChild(option);
            });
            
            // Add change event to auto-fill phone number
            callClientSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const phoneInput = document.getElementById('callPhone');
                
                if (phoneInput && selectedOption.dataset.phone) {
                    phoneInput.value = selectedOption.dataset.phone;
                }
            });
        }
    } catch (error) {
        console.error('Error loading client list:', error);
        showToast('Failed to load client list', 'error');
    }
}

/**
 * Update call history table with current data
 */
function updateCallHistoryTable() {
    const tableBody = document.querySelector('#callHistoryTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    callHistory.forEach(call => {
        const row = document.createElement('tr');
        
        // Set status badge color
        let statusBadgeClass = 'bg-success';
        if (call.status === 'missed') {
            statusBadgeClass = 'bg-danger';
        } else if (call.status === 'busy') {
            statusBadgeClass = 'bg-warning';
        }
        
        // Set call type icon
        const typeIcon = call.type === 'incoming' 
            ? '<i class="fas fa-phone-alt text-success"></i>' 
            : '<i class="fas fa-phone-volume text-primary"></i>';
        
        row.innerHTML = `
            <td>${call.client}</td>
            <td>${call.date}</td>
            <td>${call.duration}</td>
            <td>${typeIcon} ${call.type}</td>
            <td><span class="badge ${statusBadgeClass}">${call.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="viewCallDetails(${call.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-success me-1" onclick="playRecording(${call.id})">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadRecording(${call.id})">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Set up pagination control
 */
function setupPagination() {
    const pagination = document.getElementById('callHistoryPagination');
    if (!pagination) return;
    
    // Add click event to pagination
    pagination.addEventListener('click', function(e) {
        if (e.target.classList.contains('page-link')) {
            e.preventDefault();
            
            // Handle previous/next buttons
            if (e.target.textContent === 'Previous') {
                if (currentPage > 1) {
                    currentPage--;
                    loadCallHistory();
                }
            } else if (e.target.textContent === 'Next') {
                if (currentPage < totalPages) {
                    currentPage++;
                    loadCallHistory();
                }
            } else {
                // Handle number buttons
                const page = parseInt(e.target.textContent);
                if (!isNaN(page)) {
                    currentPage = page;
                    loadCallHistory();
                }
            }
        }
    });
}

/**
 * Update pagination based on current page and total pages
 */
function updatePagination() {
    const pagination = document.getElementById('callHistoryPagination');
    if (!pagination) return;
    
    // Clear existing page numbers
    pagination.innerHTML = '';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" tabindex="-1" ${currentPage === 1 ? 'aria-disabled="true"' : ''}>Previous</a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" ${currentPage === totalPages ? 'aria-disabled="true"' : ''}>Next</a>`;
    pagination.appendChild(nextLi);
}

/**
 * Search call history
 */
function searchCallHistory(searchTerm) {
    if (!searchTerm) {
        loadCallHistory();
        return;
    }
    
    // In a real implementation, this would make an API call with the search term
    // For demo purposes, we'll filter the existing data
    console.log(`Searching for: ${searchTerm}`);
    showToast(`Search functionality will be implemented in the full version`);
}

/**
 * Check for existing active call
 */
function checkForActiveCall() {
    // In a real implementation, this would check with the backend
    // For demo purposes, no active call by default
    showNoActiveCall();
}

/**
 * Handle starting a new call
 */
function handleStartCall() {
    const clientSelect = document.getElementById('callClientSelect');
    const phoneInput = document.getElementById('callPhone');
    const recordingSwitch = document.getElementById('newCallRecordingSwitch');
    
    if (!clientSelect.value) {
        showToast('Please select a client', 'error');
        return;
    }
    
    if (!phoneInput.value) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    // Prepare call data
    activeCall = {
        id: Date.now(), // Generate a temporary ID
        clientId: clientSelect.value,
        clientName: clientSelect.options[clientSelect.selectedIndex].text,
        phoneNumber: phoneInput.value,
        startTime: new Date(),
        recording: recordingSwitch.checked,
        duration: 0
    };
    
    // In a real implementation, this would make an API call to initiate the call
    console.log('Starting call to:', activeCall);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('makeCallModal'));
    modal.hide();
    
    // Show active call UI
    showActiveCall();
    
    // Start call timer
    startCallTimer();
    
    // Show success message
    showToast('Call initiated successfully');
}

/**
 * Display active call UI
 */
function showActiveCall() {
    const activeCallCard = document.getElementById('activeCallCard');
    const noActiveCallCard = document.getElementById('noActiveCallCard');
    
    if (activeCallCard && noActiveCallCard) {
        activeCallCard.style.display = 'block';
        noActiveCallCard.style.display = 'none';
        
        // Update call information
        document.getElementById('activeCallName').textContent = activeCall.clientName;
        document.getElementById('activeCallNumber').textContent = activeCall.phoneNumber;
        
        // Reset switches based on call settings
        document.getElementById('recordingSwitch').checked = activeCall.recording;
    }
}

/**
 * Display no active call UI
 */
function showNoActiveCall() {
    const activeCallCard = document.getElementById('activeCallCard');
    const noActiveCallCard = document.getElementById('noActiveCallCard');
    
    if (activeCallCard && noActiveCallCard) {
        activeCallCard.style.display = 'none';
        noActiveCallCard.style.display = 'block';
    }
}

/**
 * Start call timer
 */
function startCallTimer() {
    callDuration = 0;
    updateCallDurationDisplay();
    
    callTimer = setInterval(() => {
        callDuration++;
        updateCallDurationDisplay();
    }, 1000);
}

/**
 * Update call duration display
 */
function updateCallDurationDisplay() {
    const hours = Math.floor(callDuration / 3600);
    const minutes = Math.floor((callDuration % 3600) / 60);
    const seconds = callDuration % 60;
    
    const displayDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('activeCallDuration').textContent = displayDuration;
}

/**
 * Handle ending a call
 */
function handleEndCall() {
    // Stop timer
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // In a real implementation, this would make an API call to end the call
    console.log('Ending call:', activeCall);
    
    // Show end call animation/feedback
    const hangupBtn = document.getElementById('hangupBtn');
    if (hangupBtn) {
        hangupBtn.disabled = true;
        hangupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hanging Up...';
        
        setTimeout(() => {
            // Reset active call
            activeCall = null;
            
            // Show no active call UI
            showNoActiveCall();
            
            // Refresh call history
            loadCallHistory();
            
            // Show success message
            showToast('Call ended successfully');
        }, 1500);
    }
}

/**
 * Handle toggling mute
 */
function handleToggleMute() {
    isMuted = !isMuted;
    
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i> Unmute';
            muteBtn.classList.remove('btn-outline-secondary');
            muteBtn.classList.add('btn-secondary');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mute';
            muteBtn.classList.remove('btn-secondary');
            muteBtn.classList.add('btn-outline-secondary');
        }
    }
    
    // In a real implementation, this would toggle the microphone
    console.log('Microphone muted:', isMuted);
}

/**
 * View call details
 */
function viewCallDetails(callId) {
    // In a real implementation, this would fetch call details from the API
    console.log('Viewing details for call ID:', callId);
    
    // For demo purposes, use the first call from history
    const call = callHistory.find(c => c.id === callId) || callHistory[0];
    
    // Populate modal with call data
    document.getElementById('detailsClientName').textContent = call.client;
    document.getElementById('detailsClientPhone').textContent = '(555) 123-4567'; // Sample data
    document.getElementById('detailsClientEmail').textContent = 'client@example.com'; // Sample data
    
    document.getElementById('detailsCallDate').textContent = call.date;
    document.getElementById('detailsCallDuration').textContent = call.duration;
    document.getElementById('detailsCallStatus').textContent = call.status;
    
    // Sample transcript data
    document.getElementById('detailsCallTranscript').innerHTML = `
        <p><strong>Agent (00:05):</strong> Hello, this is Notary Voice Agent. How can I help you today?</p>
        <p><strong>Client (00:10):</strong> Hi, I need to schedule a notary session for tomorrow.</p>
        <p><strong>Agent (00:15):</strong> I'd be happy to help with that. What time works best for you?</p>
        <p><strong>Client (00:20):</strong> Around 3 PM if possible.</p>
        <p><strong>Agent (00:25):</strong> Let me check the availability. Yes, 3 PM works perfectly.</p>
    `;
    
    // Sample summary data
    document.getElementById('detailsCallSummary').innerHTML = `
        <p>The client requested a notary session for tomorrow at 3 PM. The agent confirmed the availability and scheduled the appointment. The client needs to sign loan documents, and the meeting will take place at their home address. The agent provided information about required identification and confirmed the $75 service fee.</p>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('callDetailsModal'));
    modal.show();
}

/**
 * Play call recording
 */
function playRecording(callId) {
    // In a real implementation, this would fetch the recording URL from the API
    console.log('Playing recording for call ID:', callId);
    
    // For demo purposes, use a placeholder audio
    alert('In a full implementation, this would play the actual call recording');
}

/**
 * Download call recording
 */
function downloadRecording(callId) {
    // In a real implementation, this would download the recording file
    console.log('Downloading recording for call ID:', callId);
    
    // For demo purposes, show a message
    alert('In a full implementation, this would download the actual call recording');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toastEl);
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
} 