# Notary Voice Agent Dashboard

A Next.js dashboard application for managing mobile notary services with Twilio integration for calls and SMS.

## Features

- **Call Management**: Track incoming and outgoing calls with clients
- **SMS Messaging**: Message clients with appointment details and reminders
- **Client Management**: Maintain a database of clients with contact information
- **Appointment Scheduling**: Keep track of upcoming notary appointments
- **Recording & Transcription**: Store and review call recordings and transcripts
- **Analytics & Reporting**: Visualize business metrics and performance

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Communications**: Twilio (voice calls, SMS)
- **Deployment**: Netlify or Vercel

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account
- Twilio account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/notary-voice-agent.git
cd notary-voice-agent/notary-dashboard
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=your_twilio_account_sid
NEXT_PUBLIC_TWILIO_API_KEY=your_twilio_api_key
NEXT_PUBLIC_TWILIO_API_SECRET=your_twilio_api_secret
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Database Schema

The application uses the following tables in Supabase:

- **clients**: Store client information
- **appointments**: Track scheduled notary appointments
- **calls**: Record voice call details
- **messages**: Store SMS message history

See the data types in `src/lib/supabase.ts` for the full schema details.

## Deployment

This application can be deployed on Vercel or Netlify:

```bash
npm run build
# or
yarn build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Twilio for communication APIs
- Supabase for backend services
- TailwindCSS for styling
