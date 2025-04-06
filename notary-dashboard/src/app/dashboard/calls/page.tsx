'use client';

import { useState } from 'react';

export default function CallsPage() {
  const [filter, setFilter] = useState('all');
  
  // Mock data - in a real app, this would come from the backend
  const calls = [
    { id: 1, client: 'John Smith', phone: '+15551234567', date: '2023-05-01T14:30:00', duration: '12m 35s', type: 'Outgoing', status: 'Completed', recording: true },
    { id: 2, client: 'Sarah Johnson', phone: '+15559876543', date: '2023-05-01T13:15:00', duration: '8m 12s', type: 'Incoming', status: 'Completed', recording: true },
    { id: 3, client: 'Michael Brown', phone: '+15552345678', date: '2023-05-01T10:45:00', duration: '15m 47s', type: 'Outgoing', status: 'Completed', recording: true },
    { id: 4, client: 'Emily Davis', phone: '+15558765432', date: '2023-04-30T16:20:00', duration: '4m 58s', type: 'Incoming', status: 'Missed', recording: false },
    { id: 5, client: 'David Wilson', phone: '+15553456789', date: '2023-04-30T11:30:00', duration: '22m 10s', type: 'Outgoing', status: 'Completed', recording: true },
    { id: 6, client: 'Jennifer Miller', phone: '+15554567890', date: '2023-04-29T09:15:00', duration: '18m 22s', type: 'Incoming', status: 'Completed', recording: true },
    { id: 7, client: 'Robert Taylor', phone: '+15555678901', date: '2023-04-28T15:45:00', duration: '5m 10s', type: 'Outgoing', status: 'Failed', recording: false },
    { id: 8, client: 'Jessica Adams', phone: '+15556789012', date: '2023-04-28T13:30:00', duration: '14m 05s', type: 'Incoming', status: 'Completed', recording: true },
    { id: 9, client: 'William Moore', phone: '+15557890123', date: '2023-04-27T16:00:00', duration: '7m 43s', type: 'Outgoing', status: 'Completed', recording: true },
    { id: 10, client: 'Elizabeth White', phone: '+15558901234', date: '2023-04-27T10:20:00', duration: '11m 30s', type: 'Incoming', status: 'Missed', recording: false },
  ];

  // Filter calls based on selected filter
  const filteredCalls = filter === 'all' 
    ? calls 
    : filter === 'incoming' 
    ? calls.filter(call => call.type === 'Incoming')
    : filter === 'outgoing'
    ? calls.filter(call => call.type === 'Outgoing')
    : filter === 'missed'
    ? calls.filter(call => call.status === 'Missed')
    : calls;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
        <div>
          <button className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
            <span className="mr-1">📞</span>
            New Call
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setFilter('all')}
            className={`border-transparent ${
              filter === 'all'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 text-sm font-medium`}
          >
            All Calls
          </button>
          <button
            onClick={() => setFilter('incoming')}
            className={`border-transparent ${
              filter === 'incoming'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 text-sm font-medium`}
          >
            Incoming
          </button>
          <button
            onClick={() => setFilter('outgoing')}
            className={`border-transparent ${
              filter === 'outgoing'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 text-sm font-medium`}
          >
            Outgoing
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`border-transparent ${
              filter === 'missed'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap py-4 px-1 text-sm font-medium`}
          >
            Missed
          </button>
        </nav>
      </div>
      
      {/* Call table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Recording</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{call.client}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{call.phone}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(call.date).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{call.duration}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {call.type === 'Incoming' ? '📥 Incoming' : '📤 Outgoing'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        call.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : call.status === 'Missed'
                          ? 'bg-red-100 text-red-800'
                          : call.status === 'Failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {call.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {call.recording ? '🎙️ Available' : '❌ Unavailable'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">View</button>
                      {call.recording && <button className="text-primary-600 hover:text-primary-900">Play</button>}
                      <button className="text-primary-600 hover:text-primary-900">Call</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredCalls.length}</span> of{' '}
                <span className="font-medium">{filteredCalls.length}</span> results
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