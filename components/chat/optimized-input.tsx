import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const handleSubmit = (e: React.FormEvent) => {
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      className="border-t p-4 flex gap-2 items-end"
    >
      <Textarea
        ref={inputRef}
        value={localMessage}
        onChange={(e) => setLocalMessage(e.target.value)}
        placeholder="Type your message..."
        className="min-h-[60px] resize-none"
        onKeyDown={handleKeyDown}
      />
      <Button 
        ref={buttonRef}
        type="submit" 
        disabled={localLoading || !localMessage.trim()}
        className="relative overflow-hidden transition-all duration-200 active:scale-95"
      >
        {localLoading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
