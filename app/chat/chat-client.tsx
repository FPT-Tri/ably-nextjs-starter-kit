'use client'

import * as Ably from 'ably';
import names from 'random-names-generator'

import { AblyProvider, ChannelProvider, useAbly, usePresence, usePresenceListener, useChannel } from "ably/react"
import { useState, ReactElement, FC, useEffect, useRef } from 'react'
import Logger, { LogEntry } from '../../components/logger';
import SampleHeader from '../../components/SampleHeader';

export default function Chat() {

  const [randomName] = useState(names.random());
  const [isChatOpen, setIsChatOpen] = useState(false);

  const client = new Ably.Realtime({ authUrl: '/token', authMethod: 'POST', clientId: randomName });

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName="chat-room">
        <div className="flex flex-row justify-center">
          <div className="flex flex-col justify-start items-start gap-10">
            <SampleHeader sampleName="Chat" sampleIcon="PubSubChannels.svg" sampleDocsLink="https://ably.com/docs/getting-started/react#useChannel" />
            <div className="font-manrope text-base max-w-screen-sm text-slate-800 text-opacity-100 leading-6 font-light">
              Real-time chat with Ably allows you to send and receive messages instantly, 
              track user presence, and view message history.&nbsp;
              <a href="" target="_blank"><span className="text-sky-600 text-opacity-100">
                Open this page in another tab
              </span></a>
              &nbsp;to see real-time messaging in action.
            </div>
            
            {/* Floating Chat Button */}
            <div className="flex justify-center items-center rounded-md w-[140px] h-10 bg-black">
              <div className="font-manrope text-base min-w-[100px] whitespace-nowrap text-white text-opacity-100 text-center leading-4 font-medium">
                <button onClick={() => setIsChatOpen(!isChatOpen)}>
                  {isChatOpen ? 'Close Chat' : 'Open Chat'}
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            {isChatOpen && <ChatInterface />}
          </div>
        </div>
      </ChannelProvider>
    </AblyProvider>
  )
}

// Chat Interface Component
const ChatInterface: FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; user: string; timestamp: Date }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [logEntries, setLogEntries] = useState<Array<LogEntry>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ably hooks
  const { channel, ably } = useChannel("chat-room", (message) => {
    // Handle incoming messages
    const messageData = {
      id: message.id || Date.now().toString(),
      text: message.data.text,
      user: message.clientId || 'Anonymous',
      timestamp: new Date(message.timestamp || Date.now())
    };
    
    setMessages(prev => [...prev, messageData]);
    setLogEntries(prev => [...prev, new LogEntry(`📨 Message received from ${messageData.user}: ${messageData.text}`)]);
  });

  const { updateStatus } = usePresence("chat-room", {
    status: 'online',
    user: ably.auth.clientId
  });

  // Presence listener
  const { presenceData } = usePresenceListener("chat-room", (presenceMessage) => {
    if (presenceMessage.action === 'enter') {
      setLogEntries(prev => [...prev, new LogEntry(`👋 ${presenceMessage.clientId} joined the chat`)]);
    } else if (presenceMessage.action === 'leave') {
      setLogEntries(prev => [...prev, new LogEntry(`👋 ${presenceMessage.clientId} left the chat`)]);
    }
  });

  // Load message history on component mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await channel.history({ limit: 10 });
        const historicalMessages = history.items.reverse().map(message => ({
          id: message.id || Date.now().toString(),
          text: message.data.text,
          user: message.clientId || 'Anonymous',
          timestamp: new Date(message.timestamp || Date.now())
        }));
        
        setMessages(historicalMessages);
        setLogEntries(prev => [...prev, new LogEntry(`📜 Loaded ${historicalMessages.length} historical messages`)]);
      } catch (error) {
        setLogEntries(prev => [...prev, new LogEntry(`❌ Error loading history: ${error}`)]);
      }
    };

    loadHistory();
  }, [channel]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await channel.publish("message", { text: newMessage });
      setLogEntries(prev => [...prev, new LogEntry(`📤 Message sent: ${newMessage}`)]);
      setNewMessage('');
    } catch (error) {
      setLogEntries(prev => [...prev, new LogEntry(`❌ Error sending message: ${error}`)]);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onlineUsers = presenceData.filter(user => user.data?.status === 'online');

  return (
    <div className="flex flex-col justify-start items-start gap-6">
      {/* Chat Panel */}
      <div className="flex flex-col justify-start items-start pt-6 pr-6 pb-6 pl-6 rounded-2xl w-[752px] h-[400px] bg-white border border-slate-100">
        {/* Chat Header */}
        <div className="flex flex-row justify-between items-center w-full mb-4">
          <div className="font-manrope text-lg text-black font-medium">Chat Room</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-manrope text-sm text-slate-600">
              {onlineUsers.length} online
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 w-full overflow-y-auto mb-4 space-y-3 max-h-[280px]">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-manrope text-sm font-medium text-slate-800">
                  {message.user}
                </span>
                <span className="font-manrope text-xs text-slate-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-w-[500px]">
                <span className="font-manrope text-sm text-slate-800">
                  {message.text}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex flex-row gap-2 w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-manrope text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>

      {/* Online Users Panel */}
      <div className="flex flex-col justify-start items-start pt-4 pr-4 pb-4 pl-4 rounded-2xl w-[752px] bg-white border border-slate-100">
        <div className="font-manrope text-base font-medium text-black mb-3">Online Users</div>
        <div className="flex flex-wrap gap-2">
          {onlineUsers.map((user, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-manrope text-sm text-slate-700">
                {user.clientId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Message Log */}
      <Logger logEntries={logEntries} displayHeader={true} />
    </div>
  );
};