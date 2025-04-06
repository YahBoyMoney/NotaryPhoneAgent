import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notary Voice Agent Dashboard',
  description: 'Complete management system for mobile notary services with Twilio integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
