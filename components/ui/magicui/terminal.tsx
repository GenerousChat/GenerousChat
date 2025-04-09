import { cn } from "@/lib/utils";
import React from "react";

interface TerminalProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
}

interface TerminalMessageProps {
  className?: string;
  children: React.ReactNode;
  type?: "system" | "user" | "error" | "success";
  timestamp?: string;
}

export function Terminal({ className, children, title = "System" }: TerminalProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 dark:border-neutral-800 bg-black overflow-hidden",
        className
      )}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-2 flex items-center gap-1">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
          {title}
        </span>
      </div>
      <div className="p-4 overflow-auto max-h-96 font-mono text-sm">
        {children}
      </div>
    </div>
  );
}

export function TerminalMessage({ 
  className,
  children,
  type = "system",
  timestamp = new Date().toLocaleTimeString()
}: TerminalMessageProps) {
  return (
    <div
      className={cn(
        "mb-2 last:mb-0",
        type === "system" && "text-blue-400",
        type === "user" && "text-green-400",
        type === "error" && "text-red-400",
        type === "success" && "text-emerald-400",
        className
      )}
    >
      <span className="opacity-50 mr-2">[{timestamp}]</span>
      <span className="opacity-75">$</span> {children}
    </div>
  );
} 