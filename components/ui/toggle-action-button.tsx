import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ToggleActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
  activeColor?: "red" | "green" | "blue" | "amber";
  activeIcon: React.ReactNode;
  activeText: React.ReactNode;
  inactiveIcon: React.ReactNode;
  inactiveText: React.ReactNode;
  statusIndicator?: "error" | "warning" | null;
}

const ToggleActionButton = React.forwardRef<HTMLButtonElement, ToggleActionButtonProps>(
  (
    {
      className,
      isActive,
      activeColor = "green",
      activeIcon,
      activeText,
      inactiveIcon,
      inactiveText,
      statusIndicator = null,
      ...props
    },
    ref
  ) => {
    // Map color names to their corresponding Tailwind classes
    const colorMap = {
      red: "text-red-700 dark:text-red-400",
      green: "text-green-700 dark:text-green-400",
      blue: "text-blue-700 dark:text-blue-400",
      amber: "text-amber-700 dark:text-amber-400",
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "w-full flex items-center justify-center gap-2 text-xs outline-none focus:outline-none focus:ring-0 disabled:opacity-50",
          isActive
            ? `bg-gray-100 dark:bg-gray-800 rounded-xl ${colorMap[activeColor]}`
            : "bg-transparent text-gray-700 dark:text-gray-300",
          className
        )}
        size="sm"
        {...props}
      >
        {isActive ? (
          // Content when active
          <>
            {activeIcon}
            {activeText}
            {statusIndicator === "error" && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            )}
            {statusIndicator === "warning" && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500"></span>
            )}
          </>
        ) : (
          // Content when inactive
          <>
            {inactiveIcon}
            {inactiveText}
          </>
        )}
      </Button>
    );
  }
);

ToggleActionButton.displayName = "ToggleActionButton";

export { ToggleActionButton };
