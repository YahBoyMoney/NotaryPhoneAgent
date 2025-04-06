const twilio = require('twilio');

exports.handler = async function(event, context) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Add a greeting message
  twiml.say({
    voice: 'Polly.Amy',
    language: 'en-GB',
  }, 'Hello! This is your notary assistant. How can I help you today?');

  // Add a gather element to collect user input
  const gather = twiml.gather({
    input: 'speech dtmf',
    timeout: 3,
    action: '/.netlify/functions/twilio-voice-handle',
    method: 'POST',
  });

  gather.say({
    voice: 'Polly.Amy',
    language: 'en-GB',
  }, 'Please tell me how I can assist you.');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
    body: twiml.toString(),
  };
}; 