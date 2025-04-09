"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface BackgroundGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientClassName?: string;
}

export function BackgroundGradient({
  className,
  gradientClassName,
  children,
  ...props
}: BackgroundGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setOpacity(0);
  };

  // Add touch support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      setPosition({ x, y });
      setOpacity(1);
    };

    const handleTouchStart = () => {
      setIsHovering(true);
      setOpacity(1);
    };

    const handleTouchEnd = () => {
      setIsHovering(false);
      setOpacity(0);
    };

    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300",
          gradientClassName,
          isHovering ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: isHovering
            ? `radial-gradient(circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.15), transparent 70%)`
            : ""
        }}
      />
      {children}
    </div>
  );
} 