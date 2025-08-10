'use client'

import * as Ably from 'ably';
import names from 'random-names-generator'

import { AblyProvider, ChannelProvider, useAbly, useChannel, usePresence, usePresenceListener } from "ably/react"
import { useState, ReactElement, FC, KeyboardEvent } from 'react'
import Logger, { LogEntry } from '../../components/logger';
import SampleHeader from '../../components/SampleHeader';

export default function ChatClient() {

  const [randomName] = useState(names.random());
  const client = new Ably.Realtime({ authUrl: '/token', authMethod: 'POST', clientId: randomName });

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName="chat-room">
        <div className="flex flex-row justify-center">
          <div className="flex flex-col justify-start items-start gap-10">
            <SampleHeader sampleName="Chat" sampleIcon="Chat.svg" sampleDocsLink="https://ably.com/docs/getting-started/react#useChannel" />
            <div className="font-manrope text-base max-w-screen-sm text-slate-800 text-opacity-100 leading-6 font-light">
              A complete chat application with real-time messaging and user presence.
              Join the chat to send messages and see who else is online.&nbsp;
              <a href="" target="_blank"><span className="text-sky-600 text-opacity-100">
                Open this page in another tab
              </span></a>
              &nbsp;to see real-time messaging in action.
            </div>
            <ChatMessages />
          </div>
        </div>
      </ChannelProvider>
    </AblyProvider>
  )
}

const ChatMessages: FC<any> = (): ReactElement => {

  const [logs, setLogs] = useState<Array<LogEntry>>([])
  const [messageText, setMessageText] = useState<string>('')
  const [messages, setMessages] = useState<Array<any>>([])
  const client = useAbly();

  // Set up presence
  const { updateStatus } = usePresence("chat-room", { 'status': 'available' });
  const { presenceData } = usePresenceListener("chat-room", (member) => {
    setLogs(prev => [...prev, new LogEntry(`👤 Presence ${member.action}: ${member.clientId}`)])
  });

  // Set up channel for messages
  const { channel } = useChannel("chat-room", (message: Ably.Message) => {
    const newMessage = {
      id: message.id,
      clientId: message.clientId,
      data: message.data,
      timestamp: message.timestamp,
      name: message.name
    };
    setMessages(prev => [...prev, newMessage]);
    setLogs(prev => [...prev, new LogEntry(`💬 Message from ${message.clientId}: ${message.data.text}`)]);
  });

  const sendMessage = () => {
    if (messageText.trim() && channel) {
      channel.publish('chat-message', {
        text: messageText,
        timestamp: new Date().toISOString()
      });
      setMessageText('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <>
      {/* User Presence Section */}
      <div className="flex flex-col justify-start items-start gap-4 w-[752px]">
        <div className="font-manrope text-sm min-w-[108px] whitespace-nowrap text-black text-opacity-100 leading-4 uppercase tracking-widest font-medium">
          Online Users ({presenceData.length})
        </div>
        <div className="flex flex-row justify-start items-start gap-4 pt-6 pr-6 pb-6 pl-6 rounded-lg border-slate-100 border-t border-b border-l border-r border-solid border bg-white min-w-[752px]">
          <div className="font-jetbrains-mono text-sm text-rose-400 text-opacity-100 leading-normal font-medium">
            {presenceData.length === 0 ? (
              <span className="text-slate-500">No users online</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {presenceData.map((member) => (
                  <span
                    key={member.id}
                    className="inline-block px-2 py-1 bg-rose-100 text-rose-600 rounded-md text-sm"
                  >
                    {member.clientId}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Section */}
      <div className="flex flex-col justify-start items-start gap-4 w-[752px]">
        <div className="font-manrope text-sm min-w-[108px] whitespace-nowrap text-black text-opacity-100 leading-4 uppercase tracking-widest font-medium">
          Chat Messages
        </div>
        <div className="flex flex-col justify-start items-start pt-6 pr-6 pb-6 pl-6 rounded-lg border-slate-100 border-t border-b border-l border-r border-solid border bg-white min-w-[752px] h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-slate-500 text-sm">No messages yet. Send the first message!</div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {messages.map((message, index) => (
                <div key={message.id || index} className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between items-center">
                    <span className="font-medium text-sm text-slate-700">
                      {message.clientId}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-800 text-sm">
                    {message.data.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Input Section */}
      <div className="flex flex-col justify-start items-start gap-4 w-[752px]">
        <div className="font-manrope text-sm min-w-[113px] whitespace-nowrap text-black text-opacity-100 leading-4 uppercase tracking-widest font-medium">
          Send Message
        </div>
        <div className="flex flex-row justify-start items-start gap-4 w-full">
          <input
            className="font-manrope px-3 rounded-md items-center text-base flex-1 whitespace-nowrap text-zinc-800 text-opacity-100 leading-6 font-light h-12 border-zinc-300 border-solid border bg-neutral-100"
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
          />
          <div className="flex justify-center items-center rounded-md w-24 h-12 bg-black">
            <div className="font-manrope text-base whitespace-nowrap text-white text-opacity-100 leading-4 font-medium">
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <Logger logEntries={logs} displayHeader={true} />
    </>
  )
}