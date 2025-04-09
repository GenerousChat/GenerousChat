"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    checked, 
    defaultChecked,
    onCheckedChange,
    disabled,
    ...props 
  }, ref) => {
    const [isChecked, setIsChecked] = React.useState<boolean>(
      checked !== undefined ? checked : defaultChecked || false
    );
    
    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked;
      
      if (checked === undefined) {
        setIsChecked(newChecked);
      }
      
      onCheckedChange?.(newChecked);
    };

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    // Combine forwarded ref with local ref
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    return (
      <div className="relative inline-flex">
        <input
          type="checkbox"
          ref={inputRef}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            isChecked ? "bg-primary text-primary-foreground" : "bg-background",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            className
          )}
          onClick={() => {
            if (!disabled) {
              const newChecked = !isChecked;
              
              if (checked === undefined) {
                setIsChecked(newChecked);
              }
              
              onCheckedChange?.(newChecked);
              
              // Trigger change event on hidden input for form handling
              if (inputRef.current) {
                const event = new Event("change", { bubbles: true });
                inputRef.current.dispatchEvent(event);
              }
            }
          }}
        >
          {isChecked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex h-full w-full items-center justify-center"
            >
              <Check className="h-3 w-3" />
            </motion.div>
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
