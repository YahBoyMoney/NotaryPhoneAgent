import os
import datetime
import uuid
import json
import logging
import signal
from flask import Flask, request, Response, jsonify
from twilio.twiml.voice_response import VoiceResponse, Gather
from supabase import create_client, Client
from dotenv import load_dotenv
from twilio.rest import Client as TwilioClient
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation

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

# ElevenLabs config
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "")  # Replace with your agent ID

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
    
    # Initialize ElevenLabs client
    if ELEVENLABS_API_KEY:
        eleven_labs = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        logging.info("ElevenLabs client initialized")
    else:
        logging.warning("ElevenLabs API key not set. Features will be disabled.")
        eleven_labs = None
except Exception as e:
    logging.error(f"Error initializing clients: {e}")
    eleven_labs = None

# Initialize Flask application
app = Flask(__name__)

# Service agent ID for Supabase (this would typically be a UUID from auth login)
AGENT_ID = "00000000-0000-0000-0000-000000000001"

# Active conversations (twilio call_sid -> conversation_id)
active_conversations = {}

# Store conversation transcripts
conversation_transcripts = {}

class NotaryConversationHandler:
    """Handles the notary-specific logic for conversations"""
    
    def __init__(self, call_sid, caller_number="Unknown"):
        self.call_sid = call_sid
        self.caller_number = caller_number
        self.client_name = None
        self.client_address = None
        self.appointment_time = None
        self.service_type = None
        self.price_quote = None
        self.session_id = None
        self.client_id = None
        
    def handle_service_request(self, service_text):
        """Process a service request and determine pricing"""
        service_text = service_text.lower()
        
        # Base pricing logic
        base_fee = 35
        sig_fee = 15
        travel_fee = base_fee

        # Adjust fee based on service details
        if "jail" in service_text or "detention" in service_text:
            travel_fee = 200
            self.service_type = "jail notarization"
        elif "hospital" in service_text or "medical" in service_text:
            travel_fee = 100
            self.service_type = "hospital notarization"
        elif "outside" in service_text or "out of town" in service_text or "travel" in service_text:
            travel_fee = 40  # minimum for out-of-city
            self.service_type = "travel notarization"
        else:
            self.service_type = "standard notarization"

        # After-hours adjustment
        now = datetime.datetime.now()
        after_hours = now.hour < 9 or now.hour >= 17 or now.weekday() >= 5  # After hours or weekend
        after_hours_fee = 25 if after_hours else 0
        
        total_quote = travel_fee + sig_fee + after_hours_fee
        self.price_quote = {
            "travel_fee": travel_fee,
            "signature_fee": sig_fee,
            "after_hours_fee": after_hours_fee,
            "total": total_quote
        }
        
        return self.price_quote, self.service_type
    
    def parse_booking_details(self, details_text):
        """Extract booking details from text"""
        # Simple parsing - in production you'd want better NLP
        # Extract name (first part until first comma or "at")
        name_end = min(details_text.find(',') if details_text.find(',') > 0 else len(details_text), 
                    details_text.find(' at ') if details_text.find(' at ') > 0 else len(details_text))
        self.client_name = details_text[:name_end].strip() if name_end > 0 else "Unknown"
        
        # Extract address (between name and time)
        address_start = name_end + 1
        time_start = details_text.rfind(' at ') if details_text.rfind(' at ') > 0 else len(details_text)
        self.client_address = details_text[address_start:time_start].strip().replace(',', '')
        
        # Extract requested time
        self.appointment_time = details_text[time_start + 4:].strip() if time_start < len(details_text) else ""
        
        return {
            "name": self.client_name,
            "address": self.client_address,
            "time": self.appointment_time
        }
    
    def save_to_database(self):
        """Save booking information to Supabase"""
        try:
            # Save client
            self.client_id = save_client(self.caller_number, self.client_name, self.client_address)
            
            # Save session
            self.session_id = save_session(
                self.client_id, 
                self.service_type, 
                self.appointment_time,
                notes=f"Service: {self.service_type}, Quote: ${self.price_quote['total']}"
            )
            
            # Send confirmation SMS
            if self.caller_number != "Unknown" and twilio_client:
                confirmation_message = (
                    f"Hello {self.client_name}, your notary appointment has been scheduled. "
                    f"A notary will arrive at {self.client_address}. "
                    f"Estimated total: ${self.price_quote['total']}. "
                    f"Reply to this message if you need to make any changes."
                )
                send_confirmation_sms(self.caller_number, confirmation_message)
            
            return True
        except Exception as e:
            logging.error(f"Error saving booking: {e}")
            return False

def get_greeting():
    """Return time-appropriate greeting message"""
    hour = datetime.datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 18:
        return "Good afternoon"
    else:
        return "Good evening"

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

def start_conversation(call_sid, caller_number="Unknown"):
    """Start a new conversation with ElevenLabs Conversational AI"""
    if not eleven_labs or not ELEVENLABS_AGENT_ID:
        logging.warning("ElevenLabs not configured. Cannot start conversation.")
        return None
    
    try:
        # Create a conversation handler
        handler = NotaryConversationHandler(call_sid, caller_number)
        
        # Add agent ID and session metadata
        metadata = {
            "caller_number": caller_number,
            "call_sid": call_sid,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        # Define callbacks to handle conversation state
        def agent_response_callback(response):
            """Callback for when agent responds"""
            if call_sid not in conversation_transcripts:
                conversation_transcripts[call_sid] = []
            conversation_transcripts[call_sid].append({"role": "agent", "text": response})
            logging.info(f"Agent ({call_sid}): {response}")
            
            # Check if this is a pricing quote response
            if "estimated total" in response.lower():
                # Extract pricing information from agent's response
                # This is simplified; you'd need more robust parsing in production
                try:
                    handler.handle_service_request(
                        conversation_transcripts[call_sid][-2]["text"]  # Get user's last message
                    )
                except Exception as e:
                    logging.error(f"Error extracting pricing: {e}")
                    
            # Check if this looks like a booking confirmation
            elif "scheduled your notary appointment" in response.lower():
                # Extract booking details and save to database
                try:
                    # Find last user message that likely contains booking details
                    user_messages = [msg for msg in conversation_transcripts[call_sid] if msg["role"] == "user"]
                    if len(user_messages) > 1:
                        booking_details = user_messages[-1]["text"]
                        handler.parse_booking_details(booking_details)
                        handler.save_to_database()
                except Exception as e:
                    logging.error(f"Error saving booking: {e}")
        
        def user_transcript_callback(transcript):
            """Callback for user speech transcript"""
            if call_sid not in conversation_transcripts:
                conversation_transcripts[call_sid] = []
            conversation_transcripts[call_sid].append({"role": "user", "text": transcript})
            logging.info(f"User ({call_sid}): {transcript}")
        
        # Start the conversation
        greeting = get_greeting()
        initial_prompt = f"{greeting}, thank you for calling our notary service. How can I help you today?"
        
        # Create and store the conversation object
        # In a real implementation, you'd need to handle streaming audio between
        # Twilio and ElevenLabs. This is simplified for demonstration.
        conversation_id = f"{call_sid}-{str(uuid.uuid4())}"
        active_conversations[call_sid] = conversation_id
        
        logging.info(f"Started conversation {conversation_id} for call {call_sid}")
        return conversation_id, initial_prompt
    except Exception as e:
        logging.error(f"Error starting conversation: {e}")
        return None, "Thank you for calling our notary service. How can I help you today?"

def end_conversation(call_sid):
    """End a conversation"""
    if call_sid in active_conversations:
        conversation_id = active_conversations[call_sid]
        logging.info(f"Ended conversation {conversation_id} for call {call_sid}")
        
        # Save conversation transcript to database if needed
        if call_sid in conversation_transcripts:
            try:
                # Save conversation transcript to a document
                transcript_text = "\n".join([
                    f"{msg['role'].capitalize()}: {msg['text']}" 
                    for msg in conversation_transcripts[call_sid]
                ])
                
                # In a real implementation, you'd save this to the database
                logging.info(f"Conversation transcript for {call_sid}:\n{transcript_text}")
            except Exception as e:
                logging.error(f"Error saving transcript: {e}")
        
        # Clean up
        active_conversations.pop(call_sid, None)
        conversation_transcripts.pop(call_sid, None)
        return True
    return False

@app.route("/", methods=["GET"])
def index():
    """Simple health check endpoint"""
    return "Notary Voice Agent with ElevenLabs Conversational AI is running. Point your Twilio webhook to /voice"

@app.route("/voice", methods=["POST"])
def voice():
    """Handle initial call and prompt for service needed"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    caller_number = request.values.get('From', 'Unknown')
    response = VoiceResponse()
    
    # Start call recording for compliance and quality
    response.record(timeout=0, transcribe=True, recording_status_callback="/recording-status")
    
    # Start the conversation
    conversation_id, greeting = start_conversation(call_sid, caller_number)
    
    # Create TwiML for initial greeting
    gather = Gather(input='speech', action="/handle-input", method="POST", timeout=5)
    gather.say(greeting)
    response.append(gather)
    
    # If no input detected
    response.say("I didn't catch that. Let me connect you to an agent.")
    # In production, add a redirect to a human agent here
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-input", methods=["POST"])
def handle_input():
    """Process user input and generate agent response"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    speech_result = request.values.get('SpeechResult', '')
    
    # Prepare TwiML response
    response = VoiceResponse()
    
    if call_sid in active_conversations:
        # This is a simplified flow. In a real implementation, you would:
        # 1. Send the speech to ElevenLabs API
        # 2. Get the response from the agent
        # 3. Process any actions needed (pricing, booking, etc.)
        
        # Add the user message to transcript
        if call_sid not in conversation_transcripts:
            conversation_transcripts[call_sid] = []
        conversation_transcripts[call_sid].append({"role": "user", "text": speech_result})
        
        # Process different conversation stages (simplified)
        handler = NotaryConversationHandler(call_sid)
        
        # Check for service request keywords
        if any(word in speech_result.lower() for word in ['pricing', 'quote', 'cost', 'how much', 'price', 'jail', 'hospital', 'travel']):
            # This looks like a service request
            price_quote, service_type = handler.handle_service_request(speech_result)
            total = price_quote['total']
            travel_fee = price_quote['travel_fee']
            
            agent_response = (
                f"I understand you need {service_type}. "
                f"Our travel fee is ${travel_fee} plus $15 per signature. "
                f"The estimated total is ${total}. "
                f"Would you like to schedule an appointment?"
            )
            
            # Add to transcript
            conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
            
            # Create TwiML
            gather = Gather(input='speech', action="/handle-input", method="POST", timeout=5)
            gather.say(agent_response)
            response.append(gather)
        
        # Check for booking keywords
        elif any(word in speech_result.lower() for word in ['book', 'schedule', 'appointment', 'reservation', 'yes']):
            agent_response = (
                "Great! Please tell me your name, address, and when you'd like the notary to visit. "
                "For example, 'John Smith, 123 Main Street, tomorrow at 2pm'."
            )
            
            # Add to transcript
            conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
            
            # Create TwiML
            gather = Gather(input='speech', action="/handle-booking", method="POST", timeout=10)
            gather.say(agent_response)
            response.append(gather)
        
        # General conversation
        else:
            agent_response = (
                "I'm here to help with notary services. "
                "I can provide pricing information or schedule an appointment for you. "
                "What would you like assistance with today?"
            )
            
            # Add to transcript
            conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
            
            # Create TwiML
            gather = Gather(input='speech', action="/handle-input", method="POST", timeout=5)
            gather.say(agent_response)
            response.append(gather)
    else:
        # Conversation not found, restart
        conversation_id, greeting = start_conversation(call_sid)
        
        gather = Gather(input='speech', action="/handle-input", method="POST", timeout=5)
        gather.say(greeting)
        response.append(gather)
    
    # If no input detected
    response.say("I didn't catch that. Let me connect you to an agent.")
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-booking", methods=["POST"])
def handle_booking():
    """Process booking information and save to Supabase"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    speech_result = request.values.get('SpeechResult', '')
    caller_number = request.values.get('From', 'Unknown')
    
    # Prepare TwiML response
    response = VoiceResponse()
    
    # Process booking details
    handler = NotaryConversationHandler(call_sid, caller_number)
    booking_details = handler.parse_booking_details(speech_result)
    
    # Add the user message to transcript
    if call_sid not in conversation_transcripts:
        conversation_transcripts[call_sid] = []
    conversation_transcripts[call_sid].append({"role": "user", "text": speech_result})
    
    # Save to database
    handler.save_to_database()
    
    # Generate response
    agent_response = (
        f"Thanks {booking_details['name']}! I've scheduled your notary appointment at "
        f"{booking_details['address']}. You'll receive a confirmation message shortly with all the details. "
        f"Is there anything else I can help you with today?"
    )
    
    # Add to transcript
    conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
    
    # Create TwiML
    gather = Gather(input='speech', action="/handle-follow-up", method="POST", timeout=5)
    gather.say(agent_response)
    response.append(gather)
    
    # If no input detected
    response.say("Thank you for using our notary service. Goodbye!")
    response.hangup()
    
    return Response(str(response), mimetype="text/xml")

@app.route("/handle-follow-up", methods=["POST"])
def handle_follow_up():
    """Process any follow-up questions"""
    call_sid = request.values.get('CallSid', str(uuid.uuid4()))
    speech_result = request.values.get('SpeechResult', '').lower()
    
    # Prepare TwiML response
    response = VoiceResponse()
    
    # Add the user message to transcript
    if call_sid not in conversation_transcripts:
        conversation_transcripts[call_sid] = []
    conversation_transcripts[call_sid].append({"role": "user", "text": speech_result})
    
    # Check if user wants anything else
    if any(word in speech_result for word in ['yes', 'yeah', 'yep', 'sure', 'please']):
        agent_response = "What else can I help you with regarding our notary services?"
        
        # Add to transcript
        conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
        
        # Create TwiML
        gather = Gather(input='speech', action="/handle-input", method="POST", timeout=5)
        gather.say(agent_response)
        response.append(gather)
    else:
        agent_response = "Thank you for using our notary service. We look forward to serving you. Goodbye!"
        
        # Add to transcript
        conversation_transcripts[call_sid].append({"role": "agent", "text": agent_response})
        
        # End the conversation
        end_conversation(call_sid)
        
        # Create TwiML
        response.say(agent_response)
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

@app.route("/elevenlabs-webhook", methods=["POST"])
def elevenlabs_webhook():
    """Handle ElevenLabs webhook callbacks"""
    data = request.json
    
    # Process webhook data from ElevenLabs
    logging.info(f"Received webhook from ElevenLabs: {data}")
    
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    try:
        print("Starting Notary Voice Agent with ElevenLabs Conversational AI...")
        
        if not ELEVENLABS_API_KEY:
            print("WARNING: ElevenLabs API key not set. Some features will be disabled.")
        
        if not ELEVENLABS_AGENT_ID:
            print("WARNING: ElevenLabs Agent ID not set. Conversational AI will be disabled.")
            
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        error_message = f"Error starting server: {str(e)}"
        print(error_message)
        logging.error(error_message)
        
        # Create a file with the error message for easy viewing
        with open('server_error.txt', 'w') as f:
            f.write(error_message) 