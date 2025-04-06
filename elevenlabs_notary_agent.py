import os
import datetime
import uuid
import json
from flask import Flask, request, Response, jsonify
from twilio.twiml.voice_response import VoiceResponse, Gather
from supabase import create_client, Client
from dotenv import load_dotenv
from twilio.rest import Client as TwilioClient
from elevenlabs import generate, stream, set_api_key, voices
from elevenlabs.client import ElevenLabs
import requests
import time
import logging

# Set up logging
logging.basicConfig(
    filename='notary_agent.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Load environment variables
load_dotenv()

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qiaxmvitjdwksfmvtrbd.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXhtdml0amR3a3NmbXZ0cmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4ODY1MDksImV4cCI6MjA1OTQ2MjUwOX0.L5Sx_ISnV1guaCo0uKkUtpTo9Zm-bamztfTudXl7EtE")

# Twilio config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+19518775158")

# ElevenLabs config - Add your API key to the .env file
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default Rachel voice

# Initialize clients
try:
    # Initialize Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logging.info("Supabase client initialized")
    
    # Initialize Twilio client
    twilio_client = None
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logging.info("Twilio client initialized")
    
    # Initialize ElevenLabs
    if ELEVENLABS_API_KEY:
        set_api_key(ELEVENLABS_API_KEY)
        eleven_labs = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        logging.info("ElevenLabs client initialized")
    else:
        logging.warning("ElevenLabs API key not set. TTS features will be disabled.")
        eleven_labs = None
except Exception as e:
    logging.error(f"Error initializing clients: {e}")
    eleven_labs = None

# Initialize Flask application
app = Flask(__name__)

# Service agent ID (this would typically be a UUID from auth login)
AGENT_ID = "00000000-0000-0000-0000-000000000001"

# ElevenLabs conversation state (to maintain context)
conversation_state = {}

def get_greeting():
    """Return time-appropriate greeting message"""
    hour = datetime.datetime.now().hour
    if hour < 12:
        return "Good morning, how can I help you?"
    elif hour < 18:
        return "Hi, how can I help you?"
    else:
        return "Good evening, how can I help you?"

def elevenlabs_tts(text, voice_id=ELEVENLABS_VOICE_ID, conversation_id=None):
    """Generate speech using ElevenLabs conversational API"""
    if not ELEVENLABS_API_KEY or not eleven_labs:
        logging.warning("ElevenLabs API key not set. Using default TTS.")
        return None
    
    try:
        # If this is part of a conversation, use the conversation endpoint
        if conversation_id and conversation_id in conversation_state:
            # Get the conversation history
            history = conversation_state[conversation_id]
            
            # Add the new message
            history.append({"text": text, "role": "assistant"})
            
            # Use ElevenLabs conversation API
            audio_url = None
            
            # Generate audio file URL using the Conversation API
            # This is a simplified implementation; adjust based on actual ElevenLabs API
            headers = {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            }
            
            endpoint = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
            payload = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            
            response = requests.post(endpoint, json=payload, headers=headers)
            
            if response.status_code == 200:
                # Save the audio file
                filename = f"audio_{conversation_id}_{int(time.time())}.mp3"
                with open(filename, "wb") as f:
                    f.write(response.content)
                
                # In a production environment, you'd upload this to a hosting service
                # For demo purposes, we'll just use a local file path
                audio_url = f"file://{os.path.abspath(filename)}"
                logging.info(f"Generated audio at {audio_url}")
                return audio_url
            else:
                logging.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                return None
        else:
            # Simple TTS without conversation context
            audio = generate(
                text=text,
                voice=voice_id,
                model="eleven_monolingual_v1"
            )
            
            # Save the audio file
            conversation_id = conversation_id or str(uuid.uuid4())
            filename = f"audio_{conversation_id}_{int(time.time())}.mp3"
            
            with open(filename, "wb") as f:
                f.write(audio)
            
            # Start a new conversation if needed
            if conversation_id not in conversation_state:
                conversation_state[conversation_id] = [
                    {"text": text, "role": "assistant"}
                ]
            
            # In a production environment, you'd upload this to a hosting service
            # For demo purposes, we'll just use a local file path
            audio_url = f"file://{os.path.abspath(filename)}"
            logging.info(f"Generated audio at {audio_url}")
            return audio_url
            
    except Exception as e:
        logging.error(f"Error generating ElevenLabs audio: {e}")
        return None

def save_client(phone, name, address):
    """Save or update client information, respecting RLS policies"""
    try:
        # Check if client exists
        result = supabase.table("clients").select("*").eq("phone", phone).execute()
        
        if result.data:
            # Client exists, update
            client_id = result.data[0]['id']
            supabase.table("clients").update({
                "name": name,
                "address": address,
                "updated_at": datetime.datetime.now().isoformat()
            }).eq("id", client_id).execute()
            return client_id
        else:
            # Create new client
            result = supabase.table("clients").insert({
                "agent_id": AGENT_ID,  # RLS requires agent_id to match the authenticated user
                "name": name,
                "phone": phone,
                "address": address,
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat()
            }).execute()
            return result.data[0]['id']
    except Exception as e:
        logging.error(f"Error saving client: {e}")
        # Create a fallback client entry if Supabase fails
        return str(uuid.uuid4())

def save_session(client_id, service_type, time_requested, notes=None):
    """Save session information, respecting RLS policies"""
    try:
        # Parse requested time or default to now + 1 hour
        try:
            # Simple parsing - in production you'd want better NLP
            if time_requested:
                session_time = datetime.datetime.now() + datetime.timedelta(hours=1)
            else:
                session_time = datetime.datetime.now() + datetime.timedelta(hours=1)
        except:
            session_time = datetime.datetime.now() + datetime.timedelta(hours=1)
            
        result = supabase.table("sessions").insert({
            "agent_id": AGENT_ID,  # Required for RLS
            "client_id": client_id,
            "session_date": session_time.isoformat(),
            "status": "scheduled",
            "notes": notes,
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }).execute()
        
        return result.data[0]['id'] if result.data else None
    except Exception as e:
        logging.error(f"Error saving session: {e}")
        return None

def save_call_recording(session_id, recording_url, transcript=None):
    """Save recording as a document, respecting RLS policies"""
    try:
        if session_id:
            result = supabase.table("documents").insert({
                "session_id": session_id,
                "name": f"Call Recording {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "file_url": recording_url,
                "document_type": "recording",
                "status": "completed",
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat()
            }).execute()
            return True
        return False
    except Exception as e:
        logging.error(f"Error saving recording: {e}")
        return False

def send_confirmation_sms(to_number, message):
    """Send confirmation SMS to client using Twilio"""
    if not twilio_client:
        logging.warning("Twilio client not initialized. Cannot send SMS.")
        return False
    
    try:
        message = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_number
        )
        logging.info(f"SMS sent: {message.sid}")
        return True
    except Exception as e:
        logging.error(f"Error sending SMS: {e}")
        return False

@app.route("/", methods=["GET"])
def index():
    """Simple health check endpoint"""
    return "Notary Voice Agent with ElevenLabs is running. Point your Twilio webhook to /voice"

@app.route("/voice", methods=["POST"])
def voice():
    """Handle initial call and prompt for service needed"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    response = VoiceResponse()
    
    # Start call recording for compliance and quality
    response.record(timeout=0, transcribe=True, recording_status_callback="/recording-status")
    
    # Get greeting and use ElevenLabs TTS if available
    greeting = get_greeting()
    message = f"{greeting} Thank you for calling our notary service. Please tell me what notary service you need today."
    
    # Generate ElevenLabs audio if available
    audio_url = elevenlabs_tts(message, conversation_id=call_sid)
    
    if audio_url and audio_url.startswith("file://"):
        # For local development, we'll use the standard TTS since we can't serve local files
        # In production, this would be a hosted URL
        gather = Gather(input='speech', action="/handle-service", method="POST", timeout=3)
        gather.say(message)
        response.append(gather)
    else:
        # Use standard TTS
        gather = Gather(input='speech', action="/handle-service", method="POST", timeout=3)
        gather.say(message)
        response.append(gather)
    
    # If no input detected
    response.say("I didn't catch that. Let me connect you to an agent.")
    # In production, add a redirect to a human agent here
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-service", methods=["POST"])
def handle_service():
    """Process the service request and provide quote"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    response = VoiceResponse()
    service = request.values.get('SpeechResult', '').lower()
    caller_number = request.values.get('From', 'Unknown')

    # Store client message in conversation history
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": service, "role": "user"})
    else:
        conversation_state[call_sid] = [{"text": service, "role": "user"}]

    # Base pricing logic
    base_fee = 35
    sig_fee = 15
    travel_fee = base_fee

    # Adjust fee based on service details
    if "jail" in service or "detention" in service:
        travel_fee = 200
        service_type = "jail notarization"
    elif "hospital" in service or "medical" in service:
        travel_fee = 100
        service_type = "hospital notarization"
    elif "outside" in service or "out of town" in service or "travel" in service:
        travel_fee = 40  # minimum for out-of-city
        service_type = "travel notarization"
    else:
        service_type = "standard notarization"

    # After-hours adjustment
    now = datetime.datetime.now()
    after_hours = now.hour < 9 or now.hour >= 17 or now.weekday() >= 5  # After hours or weekend
    after_hours_fee = 25 if after_hours else 0
    note = " Please note that this includes a $25 after-hours service fee." if after_hours else ""

    total_quote = travel_fee + sig_fee + after_hours_fee

    # Prepare response message
    message = f"I understand you need {service_type}. Our travel fee is ${travel_fee} plus $15 per signature. Estimated total is ${total_quote}.{note} To book your appointment, please say your name, your address, and what time you need the notary."
    
    # Generate ElevenLabs audio if available
    audio_url = elevenlabs_tts(message, conversation_id=call_sid)
    
    if audio_url and audio_url.startswith("file://"):
        # For local development, we'll use the standard TTS since we can't serve local files
        gather = Gather(input='speech', action="/handle-booking", method="POST", timeout=5)
        gather.say(message)
        response.append(gather)
    else:
        # Use standard TTS
        gather = Gather(input='speech', action="/handle-booking", method="POST", timeout=5)
        gather.say(message)
        response.append(gather)
    
    # If no input detected
    response.say("I didn't get your booking information. Let me connect you to someone who can help.")
    # In production, add a redirect to a human agent here
    
    # Save conversation state
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": message, "role": "assistant"})
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-booking", methods=["POST"])
def handle_booking():
    """Process booking information and save to Supabase with RLS"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    response = VoiceResponse()
    details = request.values.get('SpeechResult', '')
    caller = request.values.get('From', 'Unknown')
    
    # Store client message in conversation history
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": details, "role": "user"})
    
    # Simple parsing - in production you'd want better NLP
    # Extract name (first part until first comma or "at")
    name_end = min(details.find(',') if details.find(',') > 0 else len(details), 
                   details.find(' at ') if details.find(' at ') > 0 else len(details))
    name = details[:name_end].strip() if name_end > 0 else "Unknown"
    
    # Extract address (between name and time)
    address_start = name_end + 1
    time_start = details.rfind(' at ') if details.rfind(' at ') > 0 else len(details)
    address = details[address_start:time_start].strip().replace(',', '')
    
    # Extract requested time
    time_requested = details[time_start + 4:].strip() if time_start < len(details) else ""
    
    # Save to Supabase (respecting RLS)
    client_id = save_client(caller, name, address)
    session_id = save_session(client_id, "voice_booking", time_requested, notes=details)
    
    # Save call recording reference (actual recording saved in recording-status callback)
    recording_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Recordings/{call_sid}"
    
    # Send confirmation SMS if Twilio client is configured
    if caller != "Unknown" and twilio_client:
        confirmation_message = f"Hello {name}, your notary appointment has been scheduled. A notary will arrive at {address}. Reply to this message if you need to make any changes."
        send_confirmation_sms(caller, confirmation_message)
    
    # Prepare response message
    message = f"Thanks {name}! I've scheduled your notary appointment. You'll receive a confirmation message shortly with all the details. Is there anything else I can help you with? Press or say 1 for yes, or 2 to end the call."
    
    # Generate ElevenLabs audio if available
    audio_url = elevenlabs_tts(message, conversation_id=call_sid)
    
    if audio_url and audio_url.startswith("file://"):
        # For local development, we'll use the standard TTS
        response.say(f"Thanks {name}! I've scheduled your notary appointment. You'll receive a confirmation message shortly with all the details.")
        response.say("Is there anything else I can help you with?")
        
        gather = Gather(input='speech', action="/handle-follow-up", method="POST", num_digits=1, timeout=3)
        gather.say("Press or say 1 for yes, or 2 to end the call.")
        response.append(gather)
    else:
        # Use standard TTS
        response.say(f"Thanks {name}! I've scheduled your notary appointment. You'll receive a confirmation message shortly with all the details.")
        response.say("Is there anything else I can help you with?")
        
        gather = Gather(input='speech', action="/handle-follow-up", method="POST", num_digits=1, timeout=3)
        gather.say("Press or say 1 for yes, or 2 to end the call.")
        response.append(gather)
    
    # Default if no input
    response.say("Thank you for calling our notary service. Goodbye!")
    response.hangup()
    
    # Save conversation state
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": message, "role": "assistant"})
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-follow-up", methods=["POST"])
def handle_follow_up():
    """Process any follow-up questions"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    response = VoiceResponse()
    choice = request.values.get('Digits', request.values.get('SpeechResult', '')).strip().lower()
    
    # Store client message in conversation history
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": choice, "role": "user"})
    
    if choice == '1' or choice == 'one' or choice == 'yes':
        message = "I'll connect you with a notary agent who can answer any other questions you have. Our agents are currently unavailable. Please call back during business hours."
        
        # Generate ElevenLabs audio if available
        audio_url = elevenlabs_tts(message, conversation_id=call_sid)
        
        if audio_url and audio_url.startswith("file://"):
            # For local development, we'll use the standard TTS
            response.say("I'll connect you with a notary agent who can answer any other questions you have.")
            # In production, add a redirect to a human agent here
            response.say("Our agents are currently unavailable. Please call back during business hours.")
        else:
            # Use standard TTS
            response.say("I'll connect you with a notary agent who can answer any other questions you have.")
            # In production, add a redirect to a human agent here
            response.say("Our agents are currently unavailable. Please call back during business hours.")
    else:
        message = "Thank you for calling our notary service. We look forward to serving you. Goodbye!"
        
        # Generate ElevenLabs audio if available
        audio_url = elevenlabs_tts(message, conversation_id=call_sid)
        
        if audio_url and audio_url.startswith("file://"):
            # For local development, we'll use the standard TTS
            response.say(message)
        else:
            # Use standard TTS
            response.say(message)
    
    response.hangup()
    
    # Save conversation state
    if call_sid in conversation_state:
        conversation_state[call_sid].append({"text": message, "role": "assistant"})
    
    return Response(str(response), mimetype="text/xml")

@app.route("/recording-status", methods=["POST"])
def recording_status():
    """Handle recording status callbacks from Twilio"""
    recording_url = request.values.get('RecordingUrl', None)
    call_sid = request.values.get('CallSid', 'Unknown')
    recording_sid = request.values.get('RecordingSid', 'Unknown')
    transcript = request.values.get('TranscriptionText', None)
    
    # In a production app, you would:
    # 1. Look up the session_id associated with this call
    # 2. Save the recording URL to the documents table
    # 3. Update the session with the transcript
    
    return Response("", mimetype="text/xml")

@app.route("/elevenlabs-webhook", methods=["POST"])
def elevenlabs_webhook():
    """Handle ElevenLabs webhook callbacks"""
    data = request.json
    call_sid = data.get('conversation_id', str(uuid.uuid4()))
    
    # Process ElevenLabs webhook data
    # This is where you would handle events from ElevenLabs
    
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    try:
        # Get available ElevenLabs voices if API key is set
        if ELEVENLABS_API_KEY and eleven_labs:
            try:
                available_voices = voices()
                logging.info(f"Available ElevenLabs voices: {len(available_voices)}")
            except Exception as e:
                logging.error(f"Error getting ElevenLabs voices: {e}")
        
        print("Starting Notary Voice Agent with ElevenLabs integration...")
        print(f"ElevenLabs integration {'enabled' if ELEVENLABS_API_KEY else 'disabled'}")
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        error_message = f"Error starting server: {str(e)}"
        print(error_message)
        logging.error(error_message)
        
        # Create a file with the error message for easy viewing
        with open('server_error.txt', 'w') as f:
            f.write(error_message) 