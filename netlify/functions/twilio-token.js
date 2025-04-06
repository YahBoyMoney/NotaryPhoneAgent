/**
 * Netlify Function: twilio-token
 * 
 * Generates a Twilio capability token for browser clients
 * This allows the frontend to connect to Twilio's services
 */

// Import the Twilio library
const twilio = require('twilio');

exports.handler = async function(event, context) {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    // For development and demo purposes, return a mock token when
    // environment variables are not set
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing Twilio credentials. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your environment variables.',
          setup_instructions: 'Go to Netlify dashboard > Site settings > Environment variables to add your Twilio credentials'
        })
      };
    }
    
    // Initialize the Twilio token generator
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_APP_SID || null,
      incomingAllow: true // Allow incoming calls
    });

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      Math.random().toString(36).substring(2, 15) // Random identity for the client
    );

    // Add the voice grant to our token
    token.addGrant(voiceGrant);

    // Set token TTL (Time To Live) - 1 hour
    token.ttl = 3600;

    // Generate the token
    const tokenString = token.toJwt();

    // Return the token to the client
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token: tokenString })
    };
  } catch (error) {
    console.error('Error generating token:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate token',
        message: error.message
      })
    };
  }
}; 