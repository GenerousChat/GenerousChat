import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface HoverCardProps {
  children: ReactNode;
  content: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  openDelay?: number;
  closeDelay?: number;
  className?: string;
}

export function HoverCard({
  children,
  content,
  position = "top",
  align = "center",
  openDelay = 200,
  closeDelay = 300,
  className,
  ...props
}: HoverCardProps & Omit<HTMLMotionProps<"div">, "children" | "content">) {
  const [isOpen, setIsOpen] = useState(false);
  let timeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setIsOpen(true), openDelay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setIsOpen(false), closeDelay);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute z-50 min-w-[8rem] rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            position === "top" && "bottom-full mb-2",
            position === "bottom" && "top-full mt-2",
            position === "left" && "right-full mr-2",
            position === "right" && "left-full ml-2",
            align === "start" && "origin-left",
            align === "center" && "origin-center",
            align === "end" && "origin-right",
            className
          )}
          {...props}
        >
          {content}
        </motion.div>
      )}
    </div>
  );
} 