"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: React.ReactNode;
  className?: string;
}

export function InteractiveHoverButton({
  text = "Button",
  className,
  ...props
}: InteractiveHoverButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      className={cn(
        "relative flex h-12 items-center justify-center overflow-hidden rounded-lg border transition-all duration-300",
        "border-primary/20 dark:border-primary/30",
        "bg-white/90 dark:bg-black/80 backdrop-blur-sm",
        "text-primary dark:text-primary-foreground font-medium",
        "shadow-sm hover:shadow-md dark:shadow-primary/5 hover:dark:shadow-primary/10",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center">
        {text}
      </div>
      {isHovered && (
        <div
          className="absolute inset-0 z-0 transform-gpu bg-gradient-to-r from-primary/30 via-primary/40 to-primary/30 dark:from-primary/20 dark:via-primary/40 dark:to-primary/20"
          style={{
            clipPath: `circle(120px at ${position.x}px ${position.y}px)`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}
    </button>
  );
} 