import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';

export async function POST(request: Request) {
  const twiml = new VoiceResponse();
  
  // Add a greeting message
  twiml.say({
    voice: 'Polly.Amy',
    language: 'en-GB',
  }, 'Hello! This is your notary assistant. How can I help you today?');

  // Add a gather element to collect user input
  const gather = twiml.gather({
    input: 'speech dtmf',
    timeout: 3,
    action: '/api/twilio/voice/handle-input',
    method: 'POST',
  });

  gather.say({
    voice: 'Polly.Amy',
    language: 'en-GB',
  }, 'Please tell me how I can assist you.');

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 