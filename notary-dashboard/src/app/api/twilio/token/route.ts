import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Import AccessToken from twilio correctly
const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

// This is a server-side component, so we can access process.env directly
const accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID;
const apiKey = process.env.NEXT_PUBLIC_TWILIO_API_KEY;
const apiSecret = process.env.NEXT_PUBLIC_TWILIO_API_SECRET;
const outgoingApplicationSid = process.env.NEXT_PUBLIC_TWILIO_APP_SID;
const identity = process.env.NEXT_PUBLIC_TWILIO_IDENTITY || 'notary_agent';

// Validate Twilio configuration
if (!accountSid || !apiKey || !apiSecret) {
  console.error('Missing Twilio credentials in environment variables');
}

export async function POST(request: Request) {
  try {
    // Validate configuration
    if (!accountSid || !apiKey || !apiSecret) {
      return NextResponse.json(
        { 
          error: 'Server configuration error - missing Twilio credentials',
          instructions: 'Please set up Twilio environment variables'
        }, 
        { status: 500 }
      );
    }

    // Parse the request body
    const { userIdentity } = await request.json();
    
    // Use provided identity or fall back to default
    const tokenIdentity = userIdentity || identity;

    // Create an access token
    const accessToken = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      { identity: tokenIdentity }
    );

    // Create Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid,
      incomingAllow: true
    });

    // Add the grant to the token
    accessToken.addGrant(voiceGrant);

    // Generate the token string
    const token = accessToken.toJwt();

    // Return the token with expiration timestamp
    return NextResponse.json({
      token,
      identity: tokenIdentity,
      expires: Date.now() + 3600000 // 1 hour from now
    });

  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}

// Also allow GET requests for easier debugging
export async function GET() {
  try {
    // Validate configuration
    if (!accountSid || !apiKey || !apiSecret) {
      return NextResponse.json(
        { 
          error: 'Server configuration error - missing Twilio credentials',
          instructions: 'Please set up Twilio environment variables'
        }, 
        { status: 500 }
      );
    }

    // Create an access token with the default identity
    const accessToken = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      { identity }
    );

    // Create Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid,
      incomingAllow: true
    });

    // Add the grant to the token
    accessToken.addGrant(voiceGrant);

    // Generate the token string
    const token = accessToken.toJwt();

    // Return the token with expiration timestamp
    return NextResponse.json({
      token,
      identity,
      expires: Date.now() + 3600000 // 1 hour from now
    });

  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: (error as Error).message }, 
      { status: 500 }
    );
  }
} 