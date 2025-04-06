const twilio = require('twilio');

exports.handler = async function(event, context) {
  // Get environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;

  // Check if we have all required credentials
  if (!accountSid || !apiKey || !apiSecret) {
    console.error('Missing required Twilio credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Twilio credentials missing. Please configure TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET in your Netlify environment variables.'
      })
    };
  }

  try {
    // Create an access token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });

    // Generate a random identity for this client
    const identity = 'notary-agent-' + Math.random().toString(36).substring(7);

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      { identity: identity }
    );

    // Add the voice grant to our token
    token.addGrant(voiceGrant);

    // Return the token
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token.toJwt(),
        identity: identity
      })
    };
  } catch (error) {
    console.error('Error generating token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate Twilio access token: ' + error.message
      })
    };
  }
}; 