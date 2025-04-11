import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, UserInfo } from './hooks/useChatMessages';

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
                className={message.type === 'status' ? 'text-xs py-2 px-4 bg-gray-100 rounded-full border border-gray-200 shadow-sm' : `max-w-[80%] rounded-lg p-3 ${isCurrentUser(message.user_id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
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
                          {userCache[message.userId]?.name || 'Someone'} 
                          {message.statusType === 'join' && <span className="text-green-600 font-medium">has joined the chat</span>}
                          {message.statusType === 'leave' && <span className="text-orange-600 font-medium">has left the chat</span>}
                          {message.statusType === 'generation' && <span className="text-blue-600 font-medium">is creating a visualization</span>}
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <>
                    {!isCurrentUser(message.user_id) && (
                      <div className="font-medium text-xs mb-1">
                        {message.name || message.profile?.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
                      </div>
                    )}
                    <div className="break-words">{message.content}</div>
                    <div className={`text-xs mt-1 ${isCurrentUser(message.user_id) ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
