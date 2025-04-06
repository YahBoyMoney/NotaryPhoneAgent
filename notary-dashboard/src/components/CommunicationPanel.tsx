'use client';

import { useState } from 'react';
import { PhoneIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

export default function CommunicationPanel() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleCall = async () => {
    if (!phoneNumber) {
      setStatus('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setStatus('Initiating call...');

    try {
      const response = await fetch('/.netlify/functions/twilio-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'call',
          to: phoneNumber 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('Call initiated successfully!');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus('Failed to initiate call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      setStatus('Please enter both phone number and message');
      return;
    }

    setIsLoading(true);
    setStatus('Sending SMS...');

    try {
      const response = await fetch('/.netlify/functions/twilio-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'sms',
          to: phoneNumber,
          message 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('SMS sent successfully!');
        setMessage('');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus('Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Communication Tools</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Type your message here..."
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleCall}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PhoneIcon className="h-5 w-5 mr-2" />
            Make Call
          </button>

          <button
            onClick={handleSendSMS}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
            Send SMS
          </button>
        </div>

        {status && (
          <div className="mt-4 p-4 rounded-md bg-gray-50">
            <p className="text-sm text-gray-700">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
} 