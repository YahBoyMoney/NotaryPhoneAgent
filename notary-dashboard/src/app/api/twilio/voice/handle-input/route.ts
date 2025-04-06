import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';

export async function POST(request: Request) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult') as string;
  
  const twiml = new VoiceResponse();

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

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 