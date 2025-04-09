"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShinyButtonProps extends Omit<HTMLMotionProps<"button">, "onDrag" | "onDragStart" | "onDragEnd"> {
  children: React.ReactNode;
  className?: string;
}

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, ...props }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = React.useState(0);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;
      
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setPosition({ x, y });
      setOpacity(1);
    };

    const handleMouseLeave = () => {
      setOpacity(0);
    };

    if (!isMounted) {
      return null;
    }

    return (
      <motion.button
        ref={(el) => {
          // Handle both refs
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
          buttonRef.current = el;
        }}
        className={cn(
          "relative overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-2 font-medium text-neutral-950 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:bg-neutral-900",
          className
        )}
        style={{
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
        <motion.div
          className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-lg"
          style={{
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(120, 119, 198, 0.15), transparent)`,
            opacity,
          }}
          animate={{ opacity }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-lg"
          style={{
            background: `radial-gradient(100px circle at ${position.x}px ${position.y}px, rgba(120, 119, 198, 0.5), transparent)`,
            opacity,
          }}
          animate={{ opacity }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </motion.button>
    );
  }
);

ShinyButton.displayName = "ShinyButton"; 