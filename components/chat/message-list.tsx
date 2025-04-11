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
                className={message.type === 'status' ? 'text-xs text-gray-500 py-2' : `max-w-[80%] rounded-lg p-3 ${isCurrentUser(message.user_id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {message.type === 'status' ? (
                  <div>
                    {userCache[message.userId]?.name || 'Someone'} has {message.statusType === 'join' ? 'joined' : 'left'} the chat
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
