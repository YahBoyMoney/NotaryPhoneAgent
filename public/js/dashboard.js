/**
 * Dashboard module for Notary Voice Agent frontend
 * Handles dashboard UI interactions and data fetching
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initDashboard();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize dashboard by loading data and updating UI
 */
function initDashboard() {
    // Load dashboard statistics
    loadDashboardStats();
    
    // Load recent calls
    loadRecentCalls();
    
    // Load recent messages
    loadRecentMessages();
    
    // Load client list for dropdowns
    loadClientList();
}

/**
 * Set up event listeners for buttons and forms
 */
function setupEventListeners() {
    // Quick action buttons
    const makeCallBtn = document.getElementById('makeCall');
    if (makeCallBtn) {
        makeCallBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('makeCallModal'));
            modal.show();
        });
    }
    
    const sendMessageBtn = document.getElementById('sendMessage');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('sendMessageModal'));
            modal.show();
        });
    }
    
    const scheduleSessionBtn = document.getElementById('scheduleSession');
    if (scheduleSessionBtn) {
        scheduleSessionBtn.addEventListener('click', function() {
            // For now, alert as this modal doesn't exist yet
            alert('Schedule Session feature coming soon!');
        });
    }
    
    const recordCallBtn = document.getElementById('recordCall');
    if (recordCallBtn) {
        recordCallBtn.addEventListener('click', function() {
            // For now, alert as this feature isn't implemented yet
            alert('Record Call feature coming soon!');
        });
    }
    
    // Modal action buttons
    const startCallBtn = document.getElementById('startCallBtn');
    if (startCallBtn) {
        startCallBtn.addEventListener('click', function() {
            handleStartCall();
        });
    }
    
    const sendMessageModalBtn = document.getElementById('sendMessageBtn');
    if (sendMessageModalBtn) {
        sendMessageModalBtn.addEventListener('click', function() {
            handleSendMessage();
        });
    }
    
    // Refresh data button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            initDashboard();
            showToast('Dashboard data refreshed');
        });
    }
}

/**
 * Load dashboard statistics from API
 */
async function loadDashboardStats() {
    try {
        // Simulated data for now - replace with actual API call
        // const response = await fetch(CONFIG.getApiUrl('dashboard/stats'), {
        //     headers: { ...Auth.authHeader() }
        // });
        // const data = await response.json();
        
        // Simulated data
        const data = {
            clientCount: 24,
            callCount: 186,
            messageCount: 352,
            scheduledCount: 8
        };
        
        // Update UI with statistics
        document.getElementById('clientCount').textContent = data.clientCount;
        document.getElementById('callCount').textContent = data.callCount;
        document.getElementById('messageCount').textContent = data.messageCount;
        document.getElementById('scheduledCount').textContent = data.scheduledCount;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
    }
}

/**
 * Load recent calls from API
 */
async function loadRecentCalls() {
    try {
        // Simulated data for now - replace with actual API call
        // const response = await fetch(CONFIG.getApiUrl('calls/recent'), {
        //     headers: { ...Auth.authHeader() }
        // });
        // const data = await response.json();
        
        // Simulated data
        const data = [
            { id: 1, client: 'John Smith', date: '2023-04-04 14:30', duration: '12:45', status: 'completed' },
            { id: 2, client: 'Sarah Johnson', date: '2023-04-03 10:15', duration: '8:20', status: 'completed' },
            { id: 3, client: 'Michael Brown', date: '2023-04-02 16:00', duration: '15:30', status: 'completed' },
            { id: 4, client: 'Emily Davis', date: '2023-04-01 09:45', duration: '5:10', status: 'missed' }
        ];
        
        // Update UI with recent calls
        const tableBody = document.querySelector('#recentCallsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            data.forEach(call => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${call.client}</td>
                    <td>${call.date}</td>
                    <td>${call.duration}</td>
                    <td><span class="badge ${call.status === 'completed' ? 'badge-success' : 'badge-danger'}">${call.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="playRecording(${call.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="viewCallDetails(${call.id})">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading recent calls:', error);
        showToast('Failed to load recent calls', 'error');
    }
}

/**
 * Load recent messages from API
 */
async function loadRecentMessages() {
    try {
        // Simulated data for now - replace with actual API call
        // const response = await fetch(CONFIG.getApiUrl('messages/recent'), {
        //     headers: { ...Auth.authHeader() }
        // });
        // const data = await response.json();
        
        // Simulated data
        const data = [
            { id: 1, client: 'John Smith', date: '2023-04-04 15:45', content: 'Thank you for your help today.', status: 'received' },
            { id: 2, client: 'Sarah Johnson', date: '2023-04-03 11:30', content: 'Can we reschedule for tomorrow?', status: 'received' },
            { id: 3, client: 'Michael Brown', date: '2023-04-02 17:15', content: 'I\'ll be at the office at 3pm.', status: 'sent' },
            { id: 4, client: 'Emily Davis', date: '2023-04-01 10:00', content: 'Please confirm your appointment.', status: 'sent' }
        ];
        
        // Update UI with recent messages
        const tableBody = document.querySelector('#recentMessagesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            data.forEach(message => {
                const row = document.createElement('tr');
                
                // Truncate message content if too long
                const truncatedContent = message.content.length > 20 
                    ? message.content.substring(0, 20) + '...' 
                    : message.content;
                
                row.innerHTML = `
                    <td>${message.client}</td>
                    <td>${message.date}</td>
                    <td>${truncatedContent}</td>
                    <td><span class="badge ${message.status === 'received' ? 'badge-info' : 'badge-success'}">${message.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewMessageDetails(${message.id})">
                            <i class="fas fa-envelope-open"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading recent messages:', error);
        showToast('Failed to load recent messages', 'error');
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
            { id: 4, name: 'Emily Davis', phone: '(555) 456-7890' }
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
        
        // Update message client dropdown
        const messageClientSelect = document.getElementById('messageClientSelect');
        if (messageClientSelect) {
            messageClientSelect.innerHTML = '<option value="">Select a client</option>';
            
            data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                messageClientSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading client list:', error);
        showToast('Failed to load client list', 'error');
    }
}

/**
 * Handle start call button click
 */
function handleStartCall() {
    const clientSelect = document.getElementById('callClientSelect');
    const phoneInput = document.getElementById('callPhone');
    const notesInput = document.getElementById('callNotes');
    
    if (!clientSelect.value) {
        showToast('Please select a client', 'error');
        return;
    }
    
    if (!phoneInput.value) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    // Simulate API call
    console.log('Starting call to:', {
        clientId: clientSelect.value,
        clientName: clientSelect.options[clientSelect.selectedIndex].text,
        phone: phoneInput.value,
        notes: notesInput.value
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('makeCallModal'));
    modal.hide();
    
    // Show success message
    showToast('Call initiated successfully');
}

/**
 * Handle send message button click
 */
function handleSendMessage() {
    const clientSelect = document.getElementById('messageClientSelect');
    const messageText = document.getElementById('messageText');
    
    if (!clientSelect.value) {
        showToast('Please select a client', 'error');
        return;
    }
    
    if (!messageText.value) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    // Simulate API call
    console.log('Sending message:', {
        clientId: clientSelect.value,
        clientName: clientSelect.options[clientSelect.selectedIndex].text,
        message: messageText.value
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('sendMessageModal'));
    modal.hide();
    
    // Show success message
    showToast('Message sent successfully');
}

/**
 * Play call recording
 */
function playRecording(callId) {
    alert(`Playing recording for call ID: ${callId}`);
    // In a real implementation, this would open a modal with an audio player
}

/**
 * View call details
 */
function viewCallDetails(callId) {
    // In a real implementation, this would redirect to a call details page
    window.location.href = `call-details.html?id=${callId}`;
}

/**
 * View message details
 */
function viewMessageDetails(messageId) {
    // In a real implementation, this would redirect to a message details page
    window.location.href = `message-details.html?id=${messageId}`;
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