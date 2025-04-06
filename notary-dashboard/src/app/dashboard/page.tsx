export default function DashboardPage() {
  // In a real app, this data would come from the backend
  const stats = [
    { name: 'Total Calls', value: '128', change: '+14%', trend: 'up' },
    { name: 'Active Clients', value: '42', change: '+7%', trend: 'up' },
    { name: 'Appointments', value: '16', change: '-3%', trend: 'down' },
    { name: 'Call Duration', value: '386 min', change: '+12%', trend: 'up' },
  ];

  const recentCalls = [
    { id: 1, client: 'John Smith', phone: '+15551234567', date: '2023-05-01T14:30:00', duration: '12m 35s', type: 'Outgoing', status: 'Completed' },
    { id: 2, client: 'Sarah Johnson', phone: '+15559876543', date: '2023-05-01T13:15:00', duration: '8m 12s', type: 'Incoming', status: 'Completed' },
    { id: 3, client: 'Michael Brown', phone: '+15552345678', date: '2023-05-01T10:45:00', duration: '15m 47s', type: 'Outgoing', status: 'Completed' },
    { id: 4, client: 'Emily Davis', phone: '+15558765432', date: '2023-04-30T16:20:00', duration: '4m 58s', type: 'Incoming', status: 'Missed' },
    { id: 5, client: 'David Wilson', phone: '+15553456789', date: '2023-04-30T11:30:00', duration: '22m 10s', type: 'Outgoing', status: 'Completed' },
  ];

  const upcomingAppointments = [
    { id: 1, client: 'Lisa Parker', date: '2023-05-02T10:00:00', address: '123 Main St, Anytown, CA', type: 'Property Deed' },
    { id: 2, client: 'Robert Turner', date: '2023-05-02T13:30:00', address: '456 Oak Dr, Somewhere, CA', type: 'Power of Attorney' },
    { id: 3, client: 'Jessica Adams', date: '2023-05-03T15:00:00', address: '789 Pine Ln, Nowhere, CA', type: 'Loan Signing' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <span className="mr-1">📅</span>
            Last 30 Days
          </button>
          <button className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
            <span className="mr-1">📞</span>
            New Call
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-500">{stat.name}</p>
            <p className="mt-2 flex items-baseline">
              <span className="text-3xl font-semibold text-gray-900">{stat.value}</span>
              <span className={`ml-2 text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Calls */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold leading-6 text-gray-900">Recent Calls</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto">
                <div className="inline-block min-w-full py-2 align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentCalls.map((call) => (
                        <tr key={call.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{call.client}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                            {new Date(call.date).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">{call.type}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                call.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : call.status === 'Missed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {call.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <a href="/dashboard/calls" className="text-sm font-medium text-primary-600 hover:text-primary-800">
                View all calls →
              </a>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold leading-6 text-gray-900">Upcoming Appointments</h2>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                  <div className="mr-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <span className="text-xl">📅</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{appointment.client}</h3>
                    <p className="text-sm text-gray-500">{appointment.type}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(appointment.date).toLocaleString()} • {appointment.address}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a href="/dashboard/appointments" className="text-sm font-medium text-primary-600 hover:text-primary-800">
                View all appointments →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 