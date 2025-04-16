import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, UserInfo } from './hooks/useChatMessages';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: Message[];
  userCache: Record<string, UserInfo>;
  isCurrentUser: (userId: string) => boolean;
  getUserEmail: (userId: string) => string;
  getMessageTimestamp: (message: Message) => string;
  formatTime: (timestamp: string) => string;
}

export function MessageList({
  messages,
  userCache,
  isCurrentUser,
  getUserEmail,
  getMessageTimestamp,
  formatTime
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  console.log({messages});

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.type === 'chat' ? message.id : message.timestamp}
              className={`flex ${message.type === 'status' ? 'justify-center' : 
                isCurrentUser(message.user_id) ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={message.type === 'status' 
                  ? 'text-xs py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm' 
                  : `max-w-[80%] p-3 ${isCurrentUser(message.user_id) 
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-700 text-white rounded-2xl rounded-br-sm shadow-md" 
                      : "bg-muted dark:bg-gray-800 rounded-lg"}`
                }
              >
                {message.type === 'status' ? (
                  <div className="flex items-center">
                    {message.statusType === 'generation' && (
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span className={message.statusType === 'generation' ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                      {message.message ? (
                        message.message
                      ) : (
                        <>
              
                          {message.statusType === 'join' && <span className="text-green-600 font-medium">has joined the chat</span>}
                          {message.statusType === 'leave' && <span className="text-orange-600 font-medium">has left the chat</span>}
                          {message.statusType === 'generation' && <span className="text-blue-600 font-medium">is creating a visualization</span>}
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-sm mb-2">
                      {isCurrentUser(message.user_id) ? '👤 ' : 
                       message.type === 'chat' && message.users?.email === "Unknown" ? '🤖 ' : '👤 '}
                      {message.name || message.profile?.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
                    </div>
                    <div className="break-words prose prose-sm max-w-none dark:prose-invert text-xs">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    <div className={`text-xs mt-1 ${isCurrentUser(message.user_id) ? "text-white/80" : "text-muted-foreground"}`}>
                      {formatTime(getMessageTimestamp(message))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
