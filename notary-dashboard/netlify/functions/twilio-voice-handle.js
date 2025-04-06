const twilio = require('twilio');

exports.handler = async function(event, context) {
  const formData = new URLSearchParams(event.body);
  const speechResult = formData.get('SpeechResult');
  
  const twiml = new twilio.twiml.VoiceResponse();

  if (speechResult) {
    // Process the speech result and generate appropriate response
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-GB',
    }, `I heard you say: ${speechResult}. Let me help you with that.`);

    // Add more logic here to handle different types of requests
    // For now, we'll just end the call
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-GB',
    }, 'Thank you for calling. Goodbye!');
  } else {
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-GB',
    }, 'I didn\'t catch that. Please try again.');
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
    body: twiml.toString(),
  };
}; 