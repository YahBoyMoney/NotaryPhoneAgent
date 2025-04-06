'use client';

import { useState } from 'react';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState('');
  
  // Mock data - in a real app, this would come from the backend
  const conversations = [
    { id: 1, contact: 'John Smith', phone: '+15551234567', unread: 2, lastMessage: 'I\'ll be available at the appointment time.', lastMessageTime: '2023-05-01T09:30:00' },
    { id: 2, contact: 'Sarah Johnson', phone: '+15559876543', unread: 0, lastMessage: 'Thank you for the confirmation.', lastMessageTime: '2023-04-30T16:45:00' },
    { id: 3, contact: 'Michael Brown', phone: '+15552345678', unread: 1, lastMessage: 'Do I need to bring any specific documents?', lastMessageTime: '2023-04-30T11:20:00' },
    { id: 4, contact: 'Emily Davis', phone: '+15558765432', unread: 0, lastMessage: 'See you tomorrow at 2 PM.', lastMessageTime: '2023-04-29T15:10:00' },
    { id: 5, contact: 'David Wilson', phone: '+15553456789', unread: 0, lastMessage: 'I have received your email with the details.', lastMessageTime: '2023-04-28T10:05:00' },
  ];

  // Mock message data
  const messageThreads: Record<number, Array<{ id: number, text: string, incoming: boolean, timestamp: string }>> = {
    1: [
      { id: 1, text: 'Hello, this is a reminder about your appointment tomorrow at 10 AM for the property deed signing.', incoming: false, timestamp: '2023-04-30T14:30:00' },
      { id: 2, text: 'Thank you for the reminder. I will be there.', incoming: true, timestamp: '2023-04-30T14:45:00' },
      { id: 3, text: 'Great! Please bring your ID and all the documents I emailed you earlier.', incoming: false, timestamp: '2023-04-30T15:00:00' },
      { id: 4, text: 'I have all the documents ready. Should I bring anything else?', incoming: true, timestamp: '2023-05-01T08:15:00' },
      { id: 5, text: 'No, that\'s all you need. Looking forward to meeting you.', incoming: false, timestamp: '2023-05-01T08:30:00' },
      { id: 6, text: 'I\'ll be available at the appointment time.', incoming: true, timestamp: '2023-05-01T09:30:00' },
    ],
    2: [
      { id: 1, text: 'Your appointment for the power of attorney is scheduled for May 5th at 3 PM.', incoming: false, timestamp: '2023-04-28T10:00:00' },
      { id: 2, text: 'I have marked it on my calendar. Thank you.', incoming: true, timestamp: '2023-04-28T10:30:00' },
      { id: 3, text: 'I\'ve sent an email with the pre-signing checklist. Please review it before our meeting.', incoming: false, timestamp: '2023-04-29T09:15:00' },
      { id: 4, text: 'I received the email and will review the checklist, thank you.', incoming: true, timestamp: '2023-04-30T11:20:00' },
      { id: 5, text: 'Perfect! Let me know if you have any questions.', incoming: false, timestamp: '2023-04-30T13:45:00' },
      { id: 6, text: 'Thank you for the confirmation.', incoming: true, timestamp: '2023-04-30T16:45:00' },
    ],
    3: [
      { id: 1, text: 'Your loan signing appointment is confirmed for May 3rd at 11 AM.', incoming: false, timestamp: '2023-04-29T15:30:00' },
      { id: 2, text: 'Thank you for confirming. I will be there.', incoming: true, timestamp: '2023-04-29T16:00:00' },
      { id: 3, text: 'Please remember to bring your ID and any additional documents from your lender.', incoming: false, timestamp: '2023-04-30T10:45:00' },
      { id: 4, text: 'Do I need to bring any specific documents?', incoming: true, timestamp: '2023-04-30T11:20:00' },
    ],
    4: [
      { id: 1, text: 'I\'m confirming your appointment for tomorrow at 2 PM for the affidavit signing.', incoming: false, timestamp: '2023-04-28T14:30:00' },
      { id: 2, text: 'Yes, I\'ll be there. Thank you.', incoming: true, timestamp: '2023-04-28T15:10:00' },
      { id: 3, text: 'Great! The address is 123 Main St, Suite 200. Please call when you arrive.', incoming: false, timestamp: '2023-04-28T15:30:00' },
      { id: 4, text: 'See you tomorrow at 2 PM.', incoming: true, timestamp: '2023-04-29T15:10:00' },
    ],
    5: [
      { id: 1, text: 'I\'m sending you the documents for our upcoming meeting on May 7th.', incoming: false, timestamp: '2023-04-27T09:45:00' },
      { id: 2, text: 'Thank you. I\'ll look for the email.', incoming: true, timestamp: '2023-04-27T10:30:00' },
      { id: 3, text: 'The documents have been sent to your email. Please confirm when you receive them.', incoming: false, timestamp: '2023-04-27T11:15:00' },
      { id: 4, text: 'I have received your email with the details.', incoming: true, timestamp: '2023-04-28T10:05:00' },
    ],
  };
  
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    // In a real app, you would send this to the backend and then update the UI with the response
    console.log(`Sending message to ${selectedConversation}: ${newMessage}`);
    
    // Clear the input
    setNewMessage('');
  };

  const getMessages = (conversationId: number) => {
    return messageThreads[conversationId] || [];
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full overflow-hidden rounded-lg bg-white shadow">
        {/* Conversation list */}
        <div className="w-1/3 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Messages</h2>
            <div className="mt-2">
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 pl-3 pr-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Search conversations..."
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 sm:text-sm">🔍</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50 ${
                  selectedConversation === conversation.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{conversation.contact}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(conversation.lastMessageTime).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-500 truncate" style={{ maxWidth: '200px' }}>
                    {conversation.lastMessage}
                  </p>
                  {conversation.unread > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-xs font-medium text-white">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Message thread */}
        <div className="w-2/3 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 text-lg">
                        {conversations.find(c => c.id === selectedConversation)?.contact.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-lg font-medium text-gray-900">
                        {conversations.find(c => c.id === selectedConversation)?.contact}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {conversations.find(c => c.id === selectedConversation)?.phone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      <span className="mr-1">📞</span>
                      Call
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                <div className="space-y-4">
                  {getMessages(selectedConversation).map((message) => (
                    <div key={message.id} className={`flex ${message.incoming ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${
                          message.incoming
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-primary-600 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="mt-1 text-xs text-right text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Message input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="ml-3 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 