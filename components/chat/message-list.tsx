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
              key={message.id}
              className={`flex ${isCurrentUser(message.user_id) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 ${isCurrentUser(message.user_id) 
                  ? "bg-[#205cd2] text-black rounded-2xl rounded-br-sm" 
                  : "bg-muted dark:bg-gray-800 rounded-lg"}`
                }
              >
                <>
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                      <img 
                        src={message.users?.email === "Unknown" ? "/chat_message_agent_avatar.svg" : "/chat_message_user_avatar.svg"}
                        alt={message.users?.email === "Unknown" ? "Agent" : "User"}
                        className="w-5 h-5 invert dark:invert-0"
                      />
                      {message.name || message.profile?.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
                    </div>
                    <div className="break-words prose prose-sm max-w-none dark:prose-invert text-xs">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    <div className={`text-xs mt-1 ${isCurrentUser(message.user_id) ? "text-black/70" : "text-muted-foreground"}`}>
                      {formatTime(getMessageTimestamp(message))}
                    </div>
                  </>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
