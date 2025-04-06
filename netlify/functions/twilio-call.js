/**
 * Netlify Function: twilio-call
 * 
 * Initiates a Twilio call from your Twilio phone number to the specified destination
 */

// Import the Twilio library
const twilio = require('twilio');

exports.handler = async function(event, context) {
  // Set CORS headers for browser clients
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    const { to, from, twimlUrl, callbackUrl } = requestBody;

    // Validate required parameters
    if (!to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameter: to' })
      };
    }

    // For development and demo purposes, return a mock call when 
    // environment variables are not set
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Using mock call - No Twilio credentials found in environment variables');
      
      // Generate a random call SID for the mock call
      const mockCallSid = 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sid: mockCallSid,
          status: 'queued',
          mock: true,
          message: 'This is a mock call for development. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables for real functionality.'
        })
      };
    }

    // Initialize the Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Get the caller ID from the request or use the Twilio phone number from env
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || '+15005550006'; // Twilio test number if not set

    // Create the call
    const call = await client.calls.create({
      to: to,
      from: fromNumber,
      url: twimlUrl || process.env.TWILIO_TWIML_URL, // TwiML URL for call instructions
      statusCallback: callbackUrl || process.env.TWILIO_STATUS_CALLBACK, // URL for status updates
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    // Return the call information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to
      })
    };
  } catch (error) {
    console.error('Error making call:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to make call',
        message: error.message 
      })
    };
  }
}; 