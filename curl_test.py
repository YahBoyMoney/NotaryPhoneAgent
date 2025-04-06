import requests
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

def test_voice_webhook():
    """Test the voice webhook endpoint with simulated Twilio params"""
    
    # Get server URL from command line or default to localhost
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
    
    print(f"Testing voice webhook at {base_url}/voice...")
    
    # Simulate Twilio webhook POST parameters
    data = {
        'CallSid': 'CA12345678901234567890123456789012',
        'From': '+12345678900',  # Simulated caller phone number
        'To': os.getenv('TWILIO_PHONE_NUMBER', '+19518775158'),
        'Direction': 'inbound',
        'CallStatus': 'ringing'
    }
    
    try:
        # Send POST request to the voice endpoint
        response = requests.post(f"{base_url}/voice", data=data)
        
        # Print response
        print(f"Status code: {response.status_code}")
        print("Response content:")
        print(response.text)
        
        # Check for TwiML elements
        if "<Response>" in response.text and "<Gather>" in response.text:
            print("\n✅ Success: Received valid TwiML response")
        else:
            print("\n❌ Error: Response doesn't contain valid TwiML")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error connecting to server: {e}")
        print("Make sure your Flask application is running and accessible.")
    
    print("\n📞 To test the full flow, call your Twilio number after setting up the webhook URL.")

if __name__ == "__main__":
    test_voice_webhook() 