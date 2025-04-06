/**
 * Netlify Function: call-status
 * 
 * Handles call status webhooks from Twilio.
 * This function receives status updates as calls progress through different states.
 * 
 * Twilio sends webhook requests with application/x-www-form-urlencoded content type
 * containing call status information like CallSid, CallStatus, From, To, etc.
 */

// For local storage of call status history (in production, use a database)
const callStatusCache = {};

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight request successful' })
    };
  }

  // Only allow POST requests (Twilio sends webhooks as POST)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse the form data from Twilio (Twilio sends webhooks as application/x-www-form-urlencoded)
    const formData = {};
    
    // Check content type and parse accordingly
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    if (contentType.includes('application/json')) {
      // If JSON data
      const jsonData = JSON.parse(event.body);
      Object.assign(formData, jsonData);
    } else {
      // If form data
      const params = new URLSearchParams(event.body);
      for (const [key, value] of params) {
        formData[key] = value;
      }
    }

    // Extract important fields
    const {
      CallSid, 
      CallStatus, 
      From, 
      To, 
      Direction,
      CallDuration,
      RecordingUrl,
      RecordingSid
    } = formData;

    // Create a timestamp
    const timestamp = new Date().toISOString();

    // Create a call status record
    const callStatusRecord = {
      callSid: CallSid,
      status: CallStatus,
      from: From,
      to: To,
      direction: Direction || 'unknown',
      duration: CallDuration ? parseInt(CallDuration, 10) : 0,
      recordingUrl: RecordingUrl || null,
      recordingSid: RecordingSid || null,
      timestamp,
      rawData: formData // Store all data for reference
    };

    // Log the call status for monitoring
    console.log('Call status webhook received:', callStatusRecord);

    // Store in our memory cache (in production, use a database)
    if (CallSid) {
      if (!callStatusCache[CallSid]) {
        callStatusCache[CallSid] = [];
      }
      callStatusCache[CallSid].push(callStatusRecord);
      
      // Limit history to prevent memory issues
      if (callStatusCache[CallSid].length > 10) {
        callStatusCache[CallSid] = callStatusCache[CallSid].slice(-10);
      }
      
      // Clean up old records to prevent memory leaks
      const cacheCleanup = Object.keys(callStatusCache).length > 100;
      if (cacheCleanup) {
        const oldestFirst = Object.entries(callStatusCache)
          .sort(([, a], [, b]) => 
            new Date(a[0].timestamp) - new Date(b[0].timestamp)
          );
        
        // Remove oldest 20 records
        for (let i = 0; i < 20 && i < oldestFirst.length; i++) {
          delete callStatusCache[oldestFirst[i][0]];
        }
      }
    }

    // Return a success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid: CallSid,
        status: CallStatus,
        timestamp,
        message: `Call status webhook processed for ${CallSid || 'unknown call'}`
      })
    };
  } catch (error) {
    console.error('Error processing call status webhook:', error, 'Request body:', event.body);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process call status webhook',
        message: error.message,
        requestBody: event.body ? 'Present but not shown for security' : 'Empty'
      })
    };
  }
}; 