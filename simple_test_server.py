from flask import Flask, request, Response
from twilio.twiml.voice_response import VoiceResponse, Gather
import logging
import os

# Set up logging to a file
logging.basicConfig(
    filename='server.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Initialize Flask application
app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    """Simple health check endpoint"""
    logging.info("Health check endpoint accessed")
    return "Test server is running. Visit /test-voice to see TwiML output."

@app.route("/test-voice", methods=["GET", "POST"])
def test_voice():
    """Test endpoint that returns TwiML"""
    logging.info("Test voice endpoint accessed")
    response = VoiceResponse()
    response.say("This is a test response from the notary voice agent.")
    
    gather = Gather(input='speech', action="/test-followup", method="POST", timeout=3)
    gather.say("Please say something to test speech recognition.")
    response.append(gather)
    
    response.say("No input received. Goodbye.")
    
    xml_response = str(response)
    logging.debug(f"Returning TwiML: {xml_response}")
    return Response(xml_response, mimetype="text/xml")

@app.route("/test-followup", methods=["POST"])
def test_followup():
    """Test followup endpoint"""
    logging.info("Test followup endpoint accessed")
    response = VoiceResponse()
    speech_result = request.values.get('SpeechResult', 'No speech detected')
    
    logging.info(f"Speech result: {speech_result}")
    response.say(f"You said: {speech_result}")
    response.say("Test completed successfully. Goodbye.")
    response.hangup()
    
    return Response(str(response), mimetype="text/xml")

if __name__ == "__main__":
    try:
        # Write startup message to both console and log
        startup_message = "Starting test server on http://localhost:5000"
        print(startup_message)
        logging.info(startup_message)
        
        # Run the application
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        # Log any exceptions
        error_message = f"Error starting server: {str(e)}"
        print(error_message)
        logging.error(error_message)
        
        # Create a file with the error message for easy viewing
        with open('server_error.txt', 'w') as f:
            f.write(error_message) 