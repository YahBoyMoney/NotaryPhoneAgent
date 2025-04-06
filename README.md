# Notary Voice Agent Project

A comprehensive solution for mobile notaries to manage client communications, appointments, and document processing using Twilio for voice and SMS integration.

## Project Structure

This repository consists of two main parts:

1. **Notary Voice Agent API** - The main backend server that handles Twilio integration for calls and messaging.
2. **Notary Dashboard** - A Next.js admin dashboard for managing calls, clients, and appointments.

## Notary Voice Agent API

The main server handles:

- Voice call processing with Twilio
- SMS messaging capabilities
- Call recording and transcription
- Webhook endpoints for Twilio
- Integration with the dashboard app

### Key Features

- **Real Call Integration**: Uses Twilio for actual phone call management
- **SMS Capabilities**: Send and receive text messages with clients
- **Appointment Reminders**: Automated notifications for upcoming appointments
- **Recording & Transcription**: Store and transcribe client calls for reference

### Technology

- Node.js
- Express
- Twilio API
- MongoDB (for data storage)

## Notary Dashboard

The admin dashboard provides:

- Call history and management
- Client database with contact information
- Appointment scheduling and tracking
- SMS conversation threads
- Analytics and reporting

### Technology

- Next.js
- React
- TypeScript
- TailwindCSS
- Supabase (database and authentication)

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Twilio account with phone number
- Supabase account (for dashboard)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/notary-voice-agent.git
cd notary-voice-agent
```

2. Install dependencies for the main API:

```bash
npm install
```

3. Install dependencies for the dashboard:

```bash
cd notary-dashboard
npm install
```

4. Set up environment variables for both projects (see .env.example files in each directory)

5. Start the development servers:

For the main API:
```bash
npm run dev
```

For the dashboard:
```bash
cd notary-dashboard
npm run dev
```

## Deployment

Both parts of the application can be deployed separately:

- The main API can be deployed to services like Heroku, Digital Ocean, or AWS.
- The dashboard can be deployed to Vercel or Netlify for optimal Next.js support.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 