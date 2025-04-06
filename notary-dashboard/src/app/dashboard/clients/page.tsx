'use client';

import { useState } from 'react';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data - in a real app, this would come from the backend
  const clients = [
    { id: 1, name: 'John Smith', email: 'john.smith@example.com', phone: '+15551234567', appointments: 3, lastContact: '2023-05-01', notes: 'Prefers email communication' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '+15559876543', appointments: 1, lastContact: '2023-04-30', notes: 'Call before arrival' },
    { id: 3, name: 'Michael Brown', email: 'mbrown@example.com', phone: '+15552345678', appointments: 2, lastContact: '2023-04-28', notes: 'Speaks Spanish' },
    { id: 4, name: 'Emily Davis', email: 'emily.davis@example.com', phone: '+15558765432', appointments: 1, lastContact: '2023-04-25', notes: 'Hard of hearing' },
    { id: 5, name: 'David Wilson', email: 'dwilson@example.com', phone: '+15553456789', appointments: 4, lastContact: '2023-04-22', notes: '' },
    { id: 6, name: 'Jennifer Miller', email: 'jen.miller@example.com', phone: '+15554567890', appointments: 2, lastContact: '2023-04-20', notes: 'Prefers morning appointments' },
    { id: 7, name: 'Robert Taylor', email: 'rtaylor@example.com', phone: '+15555678901', appointments: 1, lastContact: '2023-04-18', notes: 'Has a service dog' },
    { id: 8, name: 'Jessica Adams', email: 'jessica.a@example.com', phone: '+15556789012', appointments: 3, lastContact: '2023-04-15', notes: 'Requires wheelchair access' },
    { id: 9, name: 'William Moore', email: 'wmoore@example.com', phone: '+15557890123', appointments: 2, lastContact: '2023-04-10', notes: '' },
    { id: 10, name: 'Elizabeth White', email: 'ewhite@example.com', phone: '+15558901234', appointments: 5, lastContact: '2023-04-05', notes: 'VIP client' },
  ];

  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <button className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
          <span className="mr-1">➕</span>
          Add Client
        </button>
      </div>
      
      {/* Search and filters */}
      <div className="flex">
        <div className="relative flex-grow">
          <input
            type="text"
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Search clients by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">🔍</span>
          </div>
        </div>
        <div className="ml-4">
          <select
            className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            defaultValue="recent"
          >
            <option value="recent">Recently Contacted</option>
            <option value="name">Name (A-Z)</option>
            <option value="appointments">Most Appointments</option>
          </select>
        </div>
      </div>
      
      {/* Clients table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Appointments</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600">{client.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">Client #{client.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{client.email}</div>
                    <div className="text-sm text-gray-500">{client.phone}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{client.appointments}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(client.lastContact).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {client.notes || <span className="text-gray-400">No notes</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex space-x-3">
                      <button className="text-primary-600 hover:text-primary-900">
                        View
                      </button>
                      <button className="text-primary-600 hover:text-primary-900">
                        Edit
                      </button>
                      <button className="text-primary-600 hover:text-primary-900">
                        <span className="mr-1">📞</span>Call
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Previous
            </button>
            <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredClients.length}</span> of{' '}
                <span className="font-medium">{filteredClients.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Previous</span>
                  &lt;
                </button>
                <button className="relative inline-flex items-center bg-primary-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  1
                </button>
                <button className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 md:inline-flex">
                  2
                </button>
                <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Next</span>
                  &gt;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 