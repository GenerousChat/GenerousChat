import React, { useRef, useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from 'lucide-react'; 

interface OptimizedInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function OptimizedInput({ onSubmit, isLoading }: OptimizedInputProps) {
  // Use useRef instead of useState to avoid re-renders during typing
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localMessage, setLocalMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
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
    onSubmit(messageToSend);
  };
  
  // Handle key press without re-rendering parent
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      className="border-t p-2 flex items-end"
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
  );
}
