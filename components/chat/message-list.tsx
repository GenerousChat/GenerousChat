import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, UserInfo } from './hooks/useChatMessages';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  name?: string; 
  users?: { email: string | null } | null; 
  profile?: { name: string | null } | null; 
}

interface MessageListProps {
  messages: Message[];
  userCache: Record<string, UserInfo>;
  isCurrentUser: (userId: string) => boolean;
  getUserEmail: (userId: string) => string;
  getMessageTimestamp: (message: Message) => string;
  formatTime: (timestamp: string) => string;
  loading: boolean;
}

export function MessageList({
  messages,
  userCache,
  formatTime,
  isCurrentUser,
  getUserEmail,
  loading
}: MessageListProps) { 

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    const scrollBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = scrollBottom < 150;

    if (messagesEndRef.current && isNearBottom) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages]);

  const getMessageTimestamp = (message: Message): number => {
    return new Date(message.created_at).getTime();
  };

  return (
    <ScrollArea className="flex-1 w-full h-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full ${isCurrentUser(message.user_id) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`w-[90%] p-3 rounded-xl ${isCurrentUser(message.user_id) 
                  ? "bg-[#FFFF87] text-black" 
                  : "bg-[#fbfbfb] dark:bg-[#383838]"}`
                }
              >
                <>
                  <div className="font-medium text-sm mb-2 flex items-center gap-2">
                    <img 
                      src={userCache[message.user_id]?.name?.toLowerCase().includes('agent') ? "/chat_message_agent_avatar.svg" : "/chat_message_user_avatar.svg"} 
                      alt={userCache[message.user_id]?.name?.toLowerCase().includes('agent') ? "Agent" : "User"}
                      className="w-5 h-5 invert dark:invert-0"
                    />
                    {message.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
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
