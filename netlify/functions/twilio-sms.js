/**
 * Netlify Function: twilio-sms
 * 
 * Sends an SMS message using Twilio from your Twilio phone number
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
    const { to, body, from, mediaUrl } = requestBody;

    // Validate required parameters
    if (!to || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          requiredParams: ['to', 'body'] 
        })
      };
    }

    // For development and demo purposes, return a mock SMS when 
    // environment variables are not set
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Using mock SMS - No Twilio credentials found in environment variables');
      
      // Generate a random SMS SID for the mock message
      const mockSmsSid = 'SM' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sid: mockSmsSid,
          status: 'queued',
          mock: true,
          message: 'This is a mock SMS for development. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables for real functionality.'
        })
      };
    }

    // Initialize the Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Get the sender ID from the request or use the Twilio phone number from env
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || '+15005550006'; // Twilio test number if not set

    // Create message options
    const messageOptions = {
      to: to,
      from: fromNumber,
      body: body
    };

    // Add media URL if provided
    if (mediaUrl) {
      messageOptions.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
    }

    // Send the SMS
    const message = await client.messages.create(messageOptions);

    // Return the message information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sid: message.sid,
        status: message.status,
        from: message.from,
        to: message.to,
        body: message.body
      })
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send SMS',
        message: error.message 
      })
    };
  }
}; 