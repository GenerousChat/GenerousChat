import React, { useRef, useState, useEffect, FormEvent, KeyboardEvent, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, UserInfo } from './hooks/useChatMessages';

interface IntegratedChatProps {
  messages: Message[];
  userCache: Record<string, UserInfo>;
  isCurrentUser: (userId: string) => boolean;
  getUserEmail: (userId: string) => string;
  formatTime: (timestamp: string) => string;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  readOnly?: boolean;
}

export function IntegratedChat({
  messages,
  userCache,
  isCurrentUser,
  getUserEmail,
  formatTime,
  onSendMessage,
  isLoading,
  readOnly = false
}: IntegratedChatProps) {
  // Input state
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localMessage, setLocalMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Message list state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  
  // Update messages ref when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesRef.current = messages;
    }
  }, [messages]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages]);
  
  // Reset local loading state when parent loading state changes
  useEffect(() => {
    if (!isLoading && localLoading) {
      setLocalLoading(false);
    }
  }, [isLoading, localLoading]);
  
  // Handle submit with optimistic UI updates
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!localMessage.trim() || localLoading) return;
    
    // Provide immediate visual feedback
    setLocalLoading(true);
    
    // Add ripple effect to button
    if (buttonRef.current) {
      const button = buttonRef.current;
      const ripple = document.createElement('span');
      
      ripple.className = 'absolute inset-0 bg-white/20 rounded-md animate-ripple';
      button.appendChild(ripple);
      
      // Remove ripple after animation
      setTimeout(() => {
        if (ripple.parentNode === button) {
          button.removeChild(ripple);
        }
      }, 600);
    }
    
    // Capture the message before clearing it
    const messageToSend = localMessage;
    
    // Clear input immediately for better UX
    setLocalMessage("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Send the message
    onSendMessage(messageToSend);
  };
  
  // Handle key press without re-rendering parent
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Memoized message list to prevent re-renders
  const renderMessages = useMemo(() => {
    // Always use messagesRef as a fallback to prevent empty renders
    const messagesToRender = messages && messages.length > 0 ? messages : messagesRef.current;
    
    if (isLoading && (!messagesToRender || messagesToRender.length === 0)) {
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
                    className="w-5 h-5 invert"
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
  }, [messages, isLoading, isCurrentUser, userCache, getUserEmail, formatTime]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 w-full overflow-y-auto" ref={containerRef}>
        <div className="p-4 space-y-4">
          {renderMessages}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input form - show only if not in read-only mode */}
      {!readOnly ? (
        <form
          onSubmit={handleSubmit}
          className="p-2 flex items-end"
        >
          <div className="relative flex-grow">
            <Textarea
              ref={inputRef}
              value={localMessage}
              onChange={(e) => setLocalMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[52px] resize-none pr-12 w-full"
              rows={1} 
              onKeyDown={handleKeyDown}
            />
            <Button 
              ref={buttonRef}
              type="submit" 
              variant="ghost" 
              size="icon" 
              disabled={localLoading || !localMessage.trim()} 
              className="absolute bottom-1.5 right-1.5 h-8 w-8 transition-colors duration-200 disabled:text-muted-foreground hover:text-primary active:scale-95"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-2 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          Sign in to join the conversation
        </div>
      )}
    </div>
  );
}
