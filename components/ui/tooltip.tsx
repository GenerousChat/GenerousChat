"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function Tooltip({
  children,
  content,
  delayDuration = 300,
  side = "top",
  align = "center",
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, delayDuration);
  }, [delayDuration]);

  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate position classes
  const positionClasses = React.useMemo(() => {
    const positions = {
      top: "bottom-full mb-2",
      right: "left-full ml-2",
      bottom: "top-full mt-2",
      left: "right-full mr-2",
    };

    const alignments = {
      start: side === "top" || side === "bottom" ? "left-0" : "top-0",
      center:
        side === "top" || side === "bottom"
          ? "left-1/2 -translate-x-1/2"
          : "top-1/2 -translate-y-1/2",
      end:
        side === "top" || side === "bottom"
          ? "right-0"
          : "bottom-0",
    };

    return `${positions[side]} ${alignments[align]}`;
  }, [side, align]);

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 min-w-max max-w-xs px-2 py-1 rounded-md text-xs bg-popover text-popover-foreground shadow-md",
              positionClasses,
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ 
  children,
  delayDuration = 300 
}: TooltipProviderProps) {
  return (
    <div data-tooltip-delay={delayDuration}>
      {children}
    </div>
  );
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export function TooltipTrigger({ 
  children,
  asChild,
  ...props 
}: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  
  return (
    <span {...props}>
      {children}
    </span>
  );
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TooltipContent({ 
  children,
  className,
  ...props 
}: TooltipContentProps) {
  return (
    <div
      className={cn(
        "z-50 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 