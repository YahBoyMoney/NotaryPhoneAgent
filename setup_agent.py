import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qiaxmvitjdwksfmvtrbd.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXhtdml0amR3a3NmbXZ0cmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4ODY1MDksImV4cCI6MjA1OTQ2MjUwOX0.L5Sx_ISnV1guaCo0uKkUtpTo9Zm-bamztfTudXl7EtE")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_service_agent():
    """Create a service agent for the Twilio voice agent"""
    print("Setting up service agent for Notary Voice Agent...")
    
    # 1. Register agent user via Supabase auth
    try:
        # You need admin rights to create users without email verification
        # For this example, create the user manually in Supabase dashboard 
        # and then use the user's ID here
        
        # For demo purposes, we'll use a fixed UUID that would be set in notary_voice_agent.py
        AGENT_ID = "00000000-0000-0000-0000-000000000001"
        USER_ID = "00000000-0000-0000-0000-000000000001"  # Replace with actual auth.users UUID
        
        # 2. Check if agent already exists
        result = supabase.table("agents").select("*").eq("id", AGENT_ID).execute()
        
        if result.data:
            print(f"Service agent already exists with ID: {AGENT_ID}")
            return AGENT_ID
        
        # 3. Create agent profile
        result = supabase.table("agents").insert({
            "id": AGENT_ID,
            "user_id": USER_ID, 
            "name": "Notary Voice Assistant",
            "email": "voiceagent@example.com",
            "phone": "+18005551212",
            "status": "active"
        }).execute()
        
        if result.data:
            agent_id = result.data[0]['id']
            print(f"Created service agent with ID: {agent_id}")
            return agent_id
        else:
            print("Failed to create service agent")
            return None
    
    except Exception as e:
        print(f"Error creating service agent: {e}")
        return None

def check_rls_setup():
    """Verify RLS is properly set up"""
    print("Checking RLS configuration...")
    
    # Try fetching tables to verify RLS is working
    try:
        # Should fail if RLS is enabled without proper authentication
        result = supabase.table("agents").select("*").execute()
        if result.data:
            print("WARNING: Could access agents table without authentication. RLS may not be configured correctly.")
        else:
            print("Agents table empty or RLS working as expected.")
    except Exception as e:
        print(f"Error accessing agents table: {e}")
        print("This may be expected if RLS is properly configured.")
    
    # Try inserting a client without proper agent_id to test RLS
    try:
        result = supabase.table("clients").insert({
            "name": "Test Client",
            "phone": "+18005551212",
            # Deliberately omitting agent_id to test RLS
        }).execute()
        
        if result.data:
            print("WARNING: Could insert client without agent_id. RLS may not be configured correctly.")
        else:
            print("Client insertion failed as expected with RLS.")
    except Exception as e:
        print(f"Client insertion error (expected with RLS): {e}")
        print("This is expected if RLS is properly configured.")

def main():
    """Main function to set up the Notary Voice Agent"""
    print("=== Notary Voice Agent Setup ===")
    
    # Create service agent if it doesn't exist
    agent_id = create_service_agent()
    
    if agent_id:
        print("\nService agent successfully configured.")
        print(f"Agent ID: {agent_id}")
        print("\nMake sure you update the AGENT_ID in notary_voice_agent.py to match this ID.")
    else:
        print("\nFailed to configure service agent.")
        print("Please check your Supabase connection and permissions.")
    
    # Check RLS configuration
    print("\n=== RLS Configuration Check ===")
    check_rls_setup()
    
    print("\n=== Setup Complete ===")
    print("Next steps:")
    print("1. Make sure you've run the RLS SQL scripts in Supabase")
    print("2. Verify the AGENT_ID in notary_voice_agent.py matches your agent")
    print("3. Set up a Twilio number and point the webhook to your Flask app")
    print("4. Deploy your Flask app or run it with ngrok for testing")

if __name__ == "__main__":
    main() 