/**
 * Notary Voice Agent Admin Dashboard
 * Main JavaScript functionality
 */

// Session management functions
function markSessionCompleted(sessionId) {
    if (confirm('Are you sure you want to mark this session as completed?')) {
        // In a real implementation, this would send an AJAX request to the server
        // For demo purposes, we'll just show an alert
        alert('Session marked as completed.');
        location.reload();
    }
}

function markSessionCanceled(sessionId) {
    if (confirm('Are you sure you want to cancel this session?')) {
        // In a real implementation, this would send an AJAX request to the server
        // For demo purposes, we'll just show an alert
        alert('Session canceled.');
        location.reload();
    }
}

function updateSession(sessionId, formData) {
    // In a real implementation, this would send an AJAX request to the server
    // For demo purposes, we'll just show an alert
    alert('Session updated successfully.');
    return true;
}

// Client management functions
function updateClient(clientId, formData) {
    // In a real implementation, this would send an AJAX request to the server
    // For demo purposes, we'll just show an alert
    alert('Client information updated successfully.');
    return true;
}

function deleteClient(clientId) {
    if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
        // In a real implementation, this would send an AJAX request to the server
        // For demo purposes, we'll just show an alert
        alert('Client deleted successfully.');
        window.location.href = '/clients';
    }
}

// Document management
function uploadDocument(sessionId, formData) {
    // In a real implementation, this would send an AJAX request to the server
    // For demo purposes, we'll just show an alert
    alert('Document uploaded successfully.');
    return true;
}

function downloadDocument(documentId) {
    // In a real implementation, this would initiate a download
    // For demo purposes, we'll just show an alert
    alert('Downloading document...');
}

// Media functions
function downloadRecording(recordingId) {
    // This would normally make an AJAX request to a server endpoint
    // For the mock version, we'll just show an alert
    alert('In a production environment, this would download recording ' + recordingId);
}

function downloadTranscript(sessionId) {
    // In a real implementation, this would initiate a download
    // For demo purposes, we'll just show an alert
    alert('Downloading transcript...');
}

// Search functions
function searchClients(query) {
    query = query.toLowerCase();
    
    // Exit if query is empty
    if (!query) {
        $('#clientsTable tbody tr').show();
        return;
    }
    
    // Search through each row
    $('#clientsTable tbody tr').each(function() {
        const name = $(this).find('td:nth-child(1)').text().toLowerCase();
        const phone = $(this).find('td:nth-child(2)').text().toLowerCase();
        const address = $(this).find('td:nth-child(3)').text().toLowerCase();
        
        // Show or hide based on match
        if (name.includes(query) || phone.includes(query) || address.includes(query)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function searchSessions(query) {
    // In a real implementation, this would filter the sessions table
    // For demo purposes, we'll use basic JS filtering
    const table = document.querySelector('#sessionsTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const textContent = row.textContent.toLowerCase();
        if (textContent.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterSessionsByStatus(status) {
    const table = document.querySelector('#sessionsTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    if (status === 'all') {
        rows.forEach(row => {
            row.style.display = '';
        });
    } else {
        rows.forEach(row => {
            const statusCell = row.querySelector('[data-status]');
            if (statusCell && statusCell.dataset.status === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
}

// Export functions
function exportClientsToCSV() {
    // In a real implementation, this would generate and download a CSV file
    // For demo purposes, we'll just show an alert
    alert('Exporting clients to CSV...');
}

function exportSessionsToCSV() {
    // In a real implementation, this would generate and download a CSV file
    // For demo purposes, we'll just show an alert
    alert('Exporting sessions to CSV...');
}

// Note functions
function addNote(clientId, noteContent) {
    // In a real implementation, this would send an AJAX request to the server
    // For demo purposes, we'll just show an alert
    alert('Note added successfully.');
    return true;
}

// Initialize all event listeners when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Client search
    const clientSearchInput = document.getElementById('clientSearch');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', function() {
            searchClients(this.value);
        });
    }
    
    // Session search
    const sessionSearchInput = document.getElementById('sessionSearch');
    if (sessionSearchInput) {
        sessionSearchInput.addEventListener('input', function() {
            searchSessions(this.value);
        });
    }
    
    // Session status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterSessionsByStatus(this.value);
        });
    }
    
    // Export buttons
    const exportClientsBtn = document.getElementById('exportClientsBtn');
    if (exportClientsBtn) {
        exportClientsBtn.addEventListener('click', exportClientsToCSV);
    }
    
    const exportSessionsBtn = document.getElementById('exportSessionsBtn');
    if (exportSessionsBtn) {
        exportSessionsBtn.addEventListener('click', exportSessionsToCSV);
    }
    
    // Download transcript buttons
    const downloadTranscriptBtns = document.querySelectorAll('[id^="downloadTranscriptBtn"]');
    downloadTranscriptBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const sessionId = this.dataset.sessionId || 'unknown';
            downloadTranscript(sessionId);
        });
    });
    
    // Document download buttons
    const downloadDocumentBtns = document.querySelectorAll('.download-document');
    downloadDocumentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const documentId = this.dataset.documentId;
            if (documentId) {
                downloadDocument(documentId);
            }
        });
    });
});

// Initialize tooltips and popovers when document is ready
$(document).ready(function() {
    // Initialize any Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize any Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Toggle responsive sidebar
    $('.navbar-toggler').on('click', function() {
        $('#sidebar').toggleClass('show');
    });
}); 