# Notary Voice Agent

A Twilio-powered voice agent for notary services with Supabase backend, implementing Row Level Security (RLS) and ElevenLabs voice synthesis.

## Overview

This project provides a complete voice agent system for notary services, allowing:
- Automated call handling for notary service requests
- Quote generation based on service type and time
- Appointment scheduling
- Client management
- Secure data access with Row Level Security
- Enhanced voice quality with ElevenLabs integration

## Quick Start

1. Make sure all dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the SQL script in Supabase SQL Editor to set up database tables and RLS policies.

3. Run the agent setup tool:
   ```bash
   python setup_agent.py
   ```

4. Set up your ElevenLabs API key:
   - Get an API key from https://elevenlabs.io/
   - Add it to your `.env` file as `ELEVENLABS_API_KEY="your_api_key_here"`
   - Optionally, select a different voice ID (default is Rachel)

5. Start the Flask application with ElevenLabs integration:
   ```bash
   python elevenlabs_notary_agent.py
   ```
   (or simply run `run_elevenlabs_agent.bat`)

6. In a new terminal window, set up ngrok to expose your local server:
   ```bash
   # If you have ngrok installed:
   ngrok http 5000
   
   # If you don't have ngrok, download it from https://ngrok.com/download
   # and then run:
   # ./ngrok http 5000
   ```

7. Configure your Twilio phone number:
   - Go to the Twilio Console: https://www.twilio.com/console/phone-numbers
   - Select your number
   - Under "Voice & Fax" configuration, set:
     - "A Call Comes In" webhook to your ngrok URL + "/voice"
     - Example: https://a1b2c3d4.ngrok.io/voice
   - Save changes

8. Make a test call to your Twilio number!

## Fixing Flask Installation Issues

If you encounter issues with Flask and Werkzeug compatibility:

1. Uninstall existing Flask and Werkzeug:
   ```bash
   pip uninstall flask werkzeug
   ```

2. Install specific versions:
   ```bash
   pip install flask==2.0.1 werkzeug==2.0.1
   ```

## ElevenLabs Integration

The enhanced version of the notary agent uses ElevenLabs for more natural voice synthesis:

### Features
- Conversational context tracking
- High-quality voice synthesis
- Multiple voice options
- Conversation history storage

### Setup
1. Create an account at https://elevenlabs.io/
2. Get your API key from the profile settings
3. Add the API key to your `.env` file
4. Optionally explore different voices in the ElevenLabs dashboard and update your voice ID

### Customization
- Change voices by updating `ELEVENLABS_VOICE_ID` in the `.env` file
- The default voice is Rachel (21m00Tcm4TlvDq8ikWAM)
- Explore other ElevenLabs voices in their web interface

## Admin Dashboard

The admin dashboard provides a web interface to monitor calls, view transcriptions, manage clients, and track business metrics.

### Features
- Call recording playback and transcript viewing
- Client management (add, edit, delete)
- Session/appointment tracking
- Business analytics and KPIs
- User authentication for secure access

### Setup
1. Make sure the required packages are installed:
   ```bash
   pip install flask flask-wtf pandas plotly
   ```
   (These are included in the requirements.txt)

2. Start the admin dashboard:
   ```bash
   python admin_dashboard.py
   ```
   (or simply run `run_admin_dashboard.bat`)

3. Access the dashboard at http://localhost:5001
   - Default username: admin
   - Default password: notaryadmin123
   
4. For production deployment, update the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables in your `.env` file or directly in the admin_dashboard.py file.

### Dashboard Sections
- **Dashboard** - Summary statistics and recent activity
- **Clients** - View and manage client database
- **Sessions** - Track all notary appointments
- **Call Recordings** - Listen to call recordings and view transcripts
- **Analytics** - Business metrics and performance indicators

### Screenshots
[Screenshots will be added in a future update]

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the `notary_voice_agent_rls.sql` script in the Supabase SQL Editor
   - This creates all required tables
   - Sets up Row Level Security policies
   - Creates security definer functions
   - Adds necessary indexes

3. Create an agent user in Supabase Auth:
   - Go to Authentication > Users in Supabase dashboard
   - Click "Add User" and create a user for your voice agent system
   - Note the UUID of this user

### 2. Environment Setup

1. Create a `.env` file with the following variables:
```
SUPABASE_URL="your-supabase-url"
SUPABASE_KEY="your-supabase-anon-key"
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
ELEVENLABS_VOICE_ID="your-preferred-voice-id"
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Agent Setup

1. Update the `USER_ID` in `setup_agent.py` with the UUID from the user created in Supabase Auth
2. Run the setup script:
```bash
python setup_agent.py
```
3. Note the generated Agent ID and update `AGENT_ID` in both agent scripts if needed

### 4. Twilio Setup

1. Create a Twilio account and purchase a phone number
2. Set up your webhook URL:
   - For local development, use ngrok: `ngrok http 5000`
   - Point your Twilio phone number's voice webhook to `https://your-ngrok-url/voice`

### 5. Run the Application

Standard agent:
```bash
python notary_voice_agent.py
```

ElevenLabs-enhanced agent:
```bash
python elevenlabs_notary_agent.py
```

## Project Structure

- `notary_voice_agent.py` - Standard Flask application with Twilio voice logic
- `elevenlabs_notary_agent.py` - Enhanced Flask app with ElevenLabs integration
- `notary_voice_agent_rls.sql` - SQL script for database schema and RLS setup
- `setup_agent.py` - Helper script to create the voice agent user and test RLS
- `requirements.txt` - Python dependencies
- `run_agent.bat` - Windows batch file to run the standard agent
- `run_elevenlabs_agent.bat` - Windows batch file to run the ElevenLabs-enhanced agent

## Row Level Security (RLS)

This project implements comprehensive RLS policies:

1. **Agents Table**:
   - Users can only view/edit their own agent profile

2. **Clients Table**:
   - Agents can only access clients they created
   - Admins can view all clients

3. **Sessions Table**:
   - Agents can only access sessions they created
   - Admins can view all sessions

4. **Documents Table**:
   - Access is controlled through session ownership
   - Security definer functions verify ownership

## Customization

- Update pricing in `handle_service()` to match your notary fees
- Modify voice prompts and flow in the various route handlers
- Add additional fields to database tables as needed

## Deployment

For production deployment:
1. Deploy to a hosting service like Heroku, AWS, or similar
2. Update your Twilio webhook URLs to point to your production server
3. Set up proper logging and monitoring
4. Consider adding a web interface for managing appointments

## Security Considerations

- Use Supabase's auth system for agent login
- Keep your `.env` file secure and out of version control
- Consider implementing additional security for sensitive operations
- Use HTTPS for all production endpoints

## Troubleshooting

- If you're having issues with the Flask application, check the console logs for errors
- For Twilio webhook issues, check the Twilio console for error messages
- For database connection issues, verify your Supabase URL and key
- Make sure your ngrok tunnel is running and the URL is updated in Twilio
- For ElevenLabs issues, check your API key and verify your account status/quota

## License

[MIT License](LICENSE) 