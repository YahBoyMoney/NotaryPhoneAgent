import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { to, from } = await request.json();

    const call = await client.calls.create({
      to,
      from: twilioPhoneNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
    });

    return NextResponse.json({ callSid: call.sid });
  } catch (error) {
    console.error('Error making call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
} 