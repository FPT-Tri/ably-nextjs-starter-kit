'use client'

import * as Ably from 'ably';
import names from 'random-names-generator'

import { AblyProvider, ChannelProvider, useAbly, useChannel, usePresence, usePresenceListener } from "ably/react"
import { useState, useEffect, useRef, ReactElement, FC } from 'react'
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
            <SampleHeader sampleName="Chat" sampleIcon="Chat.svg" sampleDocsLink="https://ably.com/docs/getting-started/react" />
            <div className="font-manrope text-base max-w-screen-sm text-slate-800 text-opacity-100 leading-6 font-light">
              Real-time chat using Ably&apos;s pub/sub channels with presence and history features.
              Join the conversation and see who else is online!&nbsp;
              <a href="" target="_blank"><span className="text-sky-600 text-opacity-100">
                Open this page in another tab
              </span></a>
              &nbsp;to simulate multiple users chatting.
            </div>
            <ChatMessages />
          </div>
        </div>
      </ChannelProvider>
    </AblyProvider>
  )
}

const ChatMessages: FC = (): ReactElement => {
  
  const [messages, setMessages] = useState<Array<{ id: string, message: Ably.Message }>>([])
  const [messageText, setMessageText] = useState<string>('')
  const [logs, setLogs] = useState<Array<LogEntry>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const client = useAbly();

  // Subscribe to chat messages
  const { channel } = useChannel("chat-room", (message: Ably.Message) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), message }])
    setLogs(prev => [...prev, new LogEntry(`💬 ${message.clientId}: ${message.data.text}`)])
  });

  // Handle presence
  const { updateStatus } = usePresence("chat-room", { status: 'online' });
  const { presenceData } = usePresenceListener("chat-room", (member) => {
    setLogs(prev => [...prev, new LogEntry(`👤 ${member.clientId} ${member.action}`)])
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load message history when component mounts
  useEffect(() => {
    const getHistory = async () => {
      if (channel) {
        try {
          const history: Ably.PaginatedResult<Ably.Message> | null = await channel.history({ limit: 50 })
          const historicalMessages: Array<{ id: string, message: Ably.Message }> = []
          
          if (history && history.items && history.items.length > 0) {
            history.items.reverse().forEach((message, index) => {
              historicalMessages.push({
                id: `history-${index}`,
                message
              })
            })
            setMessages(historicalMessages)
            setLogs(prev => [...prev, new LogEntry(`📜 Loaded ${history.items.length} historical messages`)])
          }
        } catch (err: any) {
          setLogs(prev => [...prev, new LogEntry(`❌ Error loading history: ${err.message}`)])
        }
      }
    }
    getHistory()
  }, [channel])

  const sendMessage = () => {
    if (!messageText.trim() || !channel) return
    
    channel.publish('chat-message', {
      text: messageText,
      timestamp: new Date().toISOString()
    })
    setMessageText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <div className="flex flex-row gap-6 w-[752px]">
        {/* Chat Area */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Messages Display */}
          <div className="flex flex-col gap-2 p-4 rounded-lg border-slate-100 border bg-white h-[300px] overflow-y-auto">
            <div className="font-manrope text-sm text-black text-opacity-60 uppercase tracking-widest font-medium mb-2">
              Messages
            </div>
            {messages.length === 0 ? (
              <div className="text-slate-500 text-sm italic">No messages yet. Be the first to say hello!</div>
            ) : (
              messages.map(({ id, message }) => (
                <div key={id} className="flex flex-col gap-1 p-2 rounded bg-slate-50">
                  <div className="flex flex-row justify-between items-center">
                    <span className="font-manrope text-sm font-medium text-slate-700">
                      {message.clientId}
                    </span>
                    <span className="font-manrope text-xs text-slate-500">
                      {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-manrope text-sm text-slate-800">
                    {message.data.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex flex-row gap-2">
            <input
              className="font-manrope px-3 rounded-md items-center text-base flex-1 text-zinc-800 text-opacity-100 leading-6 font-light h-12 border-zinc-300 border-solid border bg-neutral-100"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
            />
            <div className="flex justify-center items-center rounded-md w-20 h-12 bg-black">
              <button 
                onClick={sendMessage}
                className="font-manrope text-base text-white text-opacity-100 font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="flex flex-col gap-4 w-48">
          <div className="flex flex-col gap-2 p-4 rounded-lg border-slate-100 border bg-white h-[300px]">
            <div className="font-manrope text-sm text-black text-opacity-60 uppercase tracking-widest font-medium mb-2">
              Online ({presenceData.length})
            </div>
            {presenceData.length === 0 ? (
              <div className="text-slate-500 text-sm italic">No one online</div>
            ) : (
              <div className="flex flex-col gap-1">
                {presenceData.map((member) => (
                  <div key={member.clientId} className="flex flex-row items-center gap-2 p-2 rounded bg-slate-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-manrope text-sm text-slate-700 truncate">
                      {member.clientId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <Logger logEntries={logs} displayHeader={true} />
    </>
  )
}