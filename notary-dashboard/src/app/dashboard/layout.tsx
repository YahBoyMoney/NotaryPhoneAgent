import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard - Notary Voice Agent',
  description: 'Manage calls, clients, and appointments',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full border-b border-gray-200 bg-white md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center font-medium">
            <span className="text-xl font-bold text-primary-600">Notary Voice</span>
          </Link>
          <button className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <nav className="space-y-1 px-2 py-4">
          <NavItem href="/dashboard" label="Dashboard" icon="dashboard" />
          <NavItem href="/dashboard/calls" label="Calls" icon="phone" />
          <NavItem href="/dashboard/messages" label="Messages" icon="message" />
          <NavItem href="/dashboard/clients" label="Clients" icon="people" />
          <NavItem href="/dashboard/appointments" label="Appointments" icon="calendar" />
          <NavItem href="/dashboard/recordings" label="Recordings" icon="microphone" />
          <NavItem href="/dashboard/analytics" label="Analytics" icon="chart" />
          <NavItem href="/dashboard/settings" label="Settings" icon="settings" />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: string;
}

function NavItem({ href, label, icon }: NavItemProps) {
  // Simple function to render an icon based on name
  const IconComponent = () => {
    // In a real application, you would use a proper icon library
    switch (icon) {
      case 'dashboard':
        return <span className="text-xl">📊</span>;
      case 'phone':
        return <span className="text-xl">📞</span>;
      case 'message':
        return <span className="text-xl">💬</span>;
      case 'people':
        return <span className="text-xl">👥</span>;
      case 'calendar':
        return <span className="text-xl">📅</span>;
      case 'microphone':
        return <span className="text-xl">🎙️</span>;
      case 'chart':
        return <span className="text-xl">📈</span>;
      case 'settings':
        return <span className="text-xl">⚙️</span>;
      default:
        return <span className="text-xl">📄</span>;
    }
  };

  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary-600"
    >
      <span className="mr-3 flex-shrink-0">
        <IconComponent />
      </span>
      <span>{label}</span>
    </Link>
  );
} 