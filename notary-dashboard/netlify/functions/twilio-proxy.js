const twilio = require('twilio');

exports.handler = async function(event, context) {
  const { httpMethod, body } = event;
  
  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const { action, to, message } = JSON.parse(body);

    if (action === 'call') {
      const call = await client.calls.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${process.env.URL}/.netlify/functions/twilio-voice`
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ callSid: call.sid })
      };
    } else if (action === 'sms') {
      const sms = await client.messages.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ messageSid: sms.sid })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 