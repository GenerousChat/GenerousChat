import React, { useRef, useEffect } from 'react';
import { Message, UserInfo } from './hooks/useChatMessages';
import ReactMarkdown from 'react-markdown';



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
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  
  // Update ref when messages change to avoid losing them during re-renders
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesRef.current = messages;
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive or on component load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages]);


  // Use memoized render to prevent blanking during re-renders
  const renderMessages = React.useMemo(() => {
    // Always use messagesRef as a fallback to prevent empty renders
    const messagesToRender = messages && messages.length > 0 ? messages : messagesRef.current;
    
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            </div>
          ))}
        </div>
      );
    }
    
    if (!messagesToRender || messagesToRender.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground">No messages yet.</p>
        </div>
      );
    }
    
    return (
      <>
        {messagesToRender.map((message) => (
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
                  {formatTime(message.created_at)}
                </div>
              </>
            </div>
          </div>
        ))}
      </>
    );
  }, [messages, loading, isCurrentUser, userCache, getUserEmail, formatTime]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto" ref={containerRef}>
      <div className="p-4 space-y-4">
        {renderMessages}
        <div ref={messagesEndRef} /> 
      </div>
    </div>
  );
}
