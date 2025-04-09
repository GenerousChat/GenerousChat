"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, defaultChecked, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(
      checked !== undefined ? checked : defaultChecked || false
    )

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked)
      }
    }, [checked])

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked
      
      if (checked === undefined) {
        setIsChecked(newChecked)
      }
      
      onChange?.(event)
      onCheckedChange?.(newChecked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "peer h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            isChecked ? "bg-primary" : "bg-input",
            className
          )}
          onClick={() => {
            if (!props.disabled) {
              const newChecked = !isChecked
              
              if (checked === undefined) {
                setIsChecked(newChecked)
              }
              
              onCheckedChange?.(newChecked)
              
              // Simulate change event for the hidden input
              const event = new Event("change", { bubbles: true })
              if (ref && 'current' in ref && ref.current) {
                ref.current.dispatchEvent(event)
              }
            }
          }}
        >
          <motion.div
            className="h-5 w-5 rounded-full bg-background shadow-lg"
            initial={false}
            animate={{
              x: isChecked ? 20 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />
        </div>
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
