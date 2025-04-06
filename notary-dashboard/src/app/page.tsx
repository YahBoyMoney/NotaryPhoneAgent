import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <main className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl">
          Notary Voice Agent <span className="text-primary-600">Dashboard</span>
        </h1>
        
        <p className="mt-6 max-w-3xl text-lg text-gray-600">
          Complete management system for mobile notary services with Twilio integration for calls, SMS, and appointment scheduling.
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link 
            href="/dashboard" 
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            Go to Dashboard
          </Link>
          <Link 
            href="/login" 
            className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-300 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            Login
          </Link>
        </div>
        
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          <FeatureCard 
            title="Call Management" 
            description="Make and receive calls directly from your browser with full VoIP functionality."
            icon="phone"
          />
          <FeatureCard 
            title="SMS Messaging" 
            description="Send and receive text messages with clients, all logged and searchable."
            icon="chat"
          />
          <FeatureCard 
            title="Client Management" 
            description="Store and manage client contact information with easy searching and filtering."
            icon="users"
          />
          <FeatureCard 
            title="Appointment Scheduling" 
            description="Book and manage appointments with Google Calendar integration."
            icon="calendar"
          />
          <FeatureCard 
            title="Recording & Transcription" 
            description="Record calls and get automatic transcriptions for better record keeping."
            icon="mic"
          />
          <FeatureCard 
            title="Analytics & Reporting" 
            description="Get detailed insights into your calls, messages, and appointments."
            icon="chart"
          />
        </div>
      </main>
      
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Notary Voice Agent. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
        <IconForCard name={icon} />
      </div>
      <h2 className="mb-2 text-xl font-medium">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function IconForCard({ name }: { name: string }) {
  // Simple function to render an icon based on name
  // In a real application, you would use a proper icon library
  switch (name) {
    case 'phone':
      return <span className="text-primary-600 text-xl">📞</span>;
    case 'chat':
      return <span className="text-primary-600 text-xl">💬</span>;
    case 'users':
      return <span className="text-primary-600 text-xl">👥</span>;
    case 'calendar':
      return <span className="text-primary-600 text-xl">📅</span>;
    case 'mic':
      return <span className="text-primary-600 text-xl">🎙️</span>;
    case 'chart':
      return <span className="text-primary-600 text-xl">📊</span>;
    default:
      return <span className="text-primary-600 text-xl">✨</span>;
  }
}
