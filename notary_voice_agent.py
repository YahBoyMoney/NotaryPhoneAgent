import os
import datetime
import uuid
from flask import Flask, request, Response
from twilio.twiml.voice_response import VoiceResponse, Gather
from supabase import create_client, Client
from dotenv import load_dotenv
from twilio.rest import Client as TwilioClient

# Load environment variables
load_dotenv()

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qiaxmvitjdwksfmvtrbd.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXhtdml0amR3a3NmbXZ0cmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4ODY1MDksImV4cCI6MjA1OTQ2MjUwOX0.L5Sx_ISnV1guaCo0uKkUtpTo9Zm-bamztfTudXl7EtE")

# Twilio config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_API_KEY = os.getenv("TWILIO_API_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Initialize Flask application
app = Flask(__name__)

# Service agent ID (this would typically be a UUID from auth login)
# For this demo, we use a fixed UUID that would correspond to the agent in the agents table
AGENT_ID = "00000000-0000-0000-0000-000000000001"

def get_greeting():
    """Return time-appropriate greeting message"""
    hour = datetime.datetime.now().hour
    if hour < 12:
        return "Good morning, how can I help you?"
    elif hour < 18:
        return "Hi, how can I help you?"
    else:
        return "Good evening, how can I help you?"

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
        print(f"Error saving client: {e}")
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
        print(f"Error saving session: {e}")
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
        print(f"Error saving recording: {e}")
        return False

def send_confirmation_sms(to_number, message):
    """Send confirmation SMS to client using Twilio"""
    if not twilio_client:
        print("Twilio client not initialized. Cannot send SMS.")
        return False
    
    try:
        message = twilio_client.messages.create(
            body=message,
            from_=os.getenv("TWILIO_PHONE_NUMBER", "+18005551212"),  # Replace with your Twilio number
            to=to_number
        )
        print(f"SMS sent: {message.sid}")
        return True
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False

@app.route("/", methods=["GET"])
def index():
    """Simple health check endpoint"""
    return "Notary Voice Agent is running. Point your Twilio webhook to /voice"

@app.route("/voice", methods=["POST"])
def voice():
    """Handle initial call and prompt for service needed"""
    response = VoiceResponse()
    
    # Start call recording for compliance and quality
    response.record(timeout=0, transcribe=True, recording_status_callback="/recording-status")
    
    greeting = get_greeting()
    gather = Gather(input='speech', action="/handle-service", method="POST", timeout=3)
    gather.say(f"{greeting} Thank you for calling our notary service. Please tell me what notary service you need today.")
    response.append(gather)
    
    # If no input detected
    response.say("I didn't catch that. Let me connect you to an agent.")
    # In production, add a redirect to a human agent here
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-service", methods=["POST"])
def handle_service():
    """Process the service request and provide quote"""
    response = VoiceResponse()
    service = request.values.get('SpeechResult', '').lower()
    caller_number = request.values.get('From', 'Unknown')

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

    # Store service information in session
    response.say(f"I understand you need {service_type}. Our travel fee is ${travel_fee} plus $15 per signature. Estimated total is ${total_quote}.{note}")

    gather = Gather(input='speech', action="/handle-booking", method="POST", timeout=5)
    gather.say("To book your appointment, please say your name, your address, and what time you need the notary.")
    response.append(gather)
    
    # If no input detected
    response.say("I didn't get your booking information. Let me connect you to someone who can help.")
    # In production, add a redirect to a human agent here
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-booking", methods=["POST"])
def handle_booking():
    """Process booking information and save to Supabase with RLS"""
    response = VoiceResponse()
    details = request.values.get('SpeechResult', '')
    caller = request.values.get('From', 'Unknown')
    call_sid = request.values.get('CallSid', 'Unknown')
    
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
    
    response.say(f"Thanks {name}! I've scheduled your notary appointment. You'll receive a confirmation message shortly with all the details.")
    response.say("Is there anything else I can help you with?")
    
    gather = Gather(input='speech', action="/handle-follow-up", method="POST", num_digits=1, timeout=3)
    gather.say("Press or say 1 for yes, or 2 to end the call.")
    response.append(gather)
    
    # Default if no input
    response.say("Thank you for calling our notary service. Goodbye!")
    response.hangup()
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-follow-up", methods=["POST"])
def handle_follow_up():
    """Process any follow-up questions"""
    response = VoiceResponse()
    choice = request.values.get('Digits', request.values.get('SpeechResult', '')).strip().lower()
    
    if choice == '1' or choice == 'one' or choice == 'yes':
        response.say("I'll connect you with a notary agent who can answer any other questions you have.")
        # In production, add a redirect to a human agent here
        response.say("Our agents are currently unavailable. Please call back during business hours.")
    else:
        response.say("Thank you for calling our notary service. We look forward to serving you. Goodbye!")
    
    response.hangup()
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

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000))) 