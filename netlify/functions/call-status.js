/**
 * Netlify Function: call-status
 * 
 * Handles call status webhooks from Twilio.
 * This function receives status updates as calls progress through different states.
 */

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
    const params = new URLSearchParams(event.body);
    
    // Convert form data to object
    for (const [key, value] of params) {
      formData[key] = value;
    }

    // Log the call status for monitoring
    console.log('Call status webhook received:', {
      callSid: formData.CallSid,
      callStatus: formData.CallStatus,
      from: formData.From,
      to: formData.To,
      direction: formData.Direction,
      timestamp: new Date().toISOString()
    });

    // Here you would typically:
    // 1. Store call status in a database
    // 2. Trigger other services or notifications based on call status
    // 3. Update your application state

    // For now, we'll just return the received data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid: formData.CallSid,
        status: formData.CallStatus,
        message: `Call status webhook processed for ${formData.CallSid}`
      })
    };
  } catch (error) {
    console.error('Error processing call status webhook:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process call status webhook',
        message: error.message 
      })
    };
  }
}; 