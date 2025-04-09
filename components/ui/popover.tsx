"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface PopoverContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: React.createRef<HTMLElement | null>(),
  contentRef: React.createRef<HTMLDivElement | null>(),
})

function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  
  const setOpen = React.useCallback((state: boolean | ((prevState: boolean) => boolean)) => {
    if (!isControlled) {
      setUncontrolledOpen(state)
    }
    if (onOpenChange) {
      const newState = typeof state === "function" ? state(open) : state
      onOpenChange(newState)
    }
  }, [isControlled, onOpenChange, open])
  
  // Close popover when clicking outside
  React.useEffect(() => {
    if (!open) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current && 
        triggerRef.current && 
        !contentRef.current.contains(event.target as Node) && 
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen])
  
  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, onClick, children, ...props }, forwardedRef) => {
    const { setOpen, open, triggerRef } = React.useContext(PopoverContext)
    
    // Combine the forwarded ref with the context ref
    const ref = React.useCallback((node: HTMLButtonElement | null) => {
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
      
      if (triggerRef && node) {
        triggerRef.current = node
      }
    }, [forwardedRef, triggerRef])
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      setOpen(!open)
    }
    
    if (asChild && React.isValidElement(children)) {
      const childProps = children.props as { onClick?: React.MouseEventHandler }
      
      return React.cloneElement(
        children,
        {
          ...props,
          ref: (node: HTMLElement | null) => {
            // Pass ref to the child component
            if (node) {
              triggerRef.current = node
            }
            
            // Call the original ref if it exists
            const originalRef = (children as any).ref
            if (typeof originalRef === "function") {
              originalRef(node)
            } else if (originalRef) {
              (originalRef as React.MutableRefObject<HTMLElement | null>).current = node
            }
          },
          onClick: (e: React.MouseEvent) => {
            // Call the original onClick if it exists
            if (childProps?.onClick) {
              childProps.onClick(e)
            }
            setOpen(!open)
          },
        } as React.HTMLAttributes<HTMLElement>
      )
    }
    
    return (
      <button
        type="button"
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
PopoverTrigger.displayName = "PopoverTrigger"

interface PopoverContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  side?: "top" | "right" | "bottom" | "left"
}

type MotionDivProps = Omit<HTMLMotionProps<"div">, "ref">

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ 
    className, 
    children, 
    align = "center", 
    sideOffset = 4,
    alignOffset = 0,
    side = "bottom",
    ...props 
  }, forwardedRef) => {
    const { open, contentRef } = React.useContext(PopoverContext)
    const [mounted, setMounted] = React.useState(false)
    
    // Combine the forwarded ref with the context ref
    const ref = React.useCallback((node: HTMLDivElement | null) => {
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
      
      if (contentRef && node) {
        contentRef.current = node
      }
    }, [forwardedRef, contentRef])
    
    // Position calculation
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    const calculatePosition = React.useCallback(() => {
      const { triggerRef } = React.useContext(PopoverContext)
      if (!triggerRef.current || !contentRef.current) return
      
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      
      let top = 0
      let left = 0
      
      // Calculate position based on side
      switch (side) {
        case "top":
          top = triggerRect.top - contentRect.height - sideOffset
          break
        case "bottom":
          top = triggerRect.bottom + sideOffset
          break
        case "left":
          left = triggerRect.left - contentRect.width - sideOffset
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          break
        case "right":
          left = triggerRect.right + sideOffset
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          break
      }
      
      // Adjust horizontal alignment for top and bottom
      if (side === "top" || side === "bottom") {
        switch (align) {
          case "start":
            left = triggerRect.left + alignOffset
            break
          case "center":
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
            break
          case "end":
            left = triggerRect.right - contentRect.width - alignOffset
            break
        }
      }
      
      // Adjust vertical alignment for left and right
      if (side === "left" || side === "right") {
        switch (align) {
          case "start":
            top = triggerRect.top + alignOffset
            break
          case "center":
            top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
            break
          case "end":
            top = triggerRect.bottom - contentRect.height - alignOffset
            break
        }
      }
      
      setPosition({ top, left })
    }, [align, alignOffset, sideOffset, side])
    
    React.useEffect(() => {
      setMounted(true)
    }, [])
    
    React.useEffect(() => {
      if (open) {
        calculatePosition()
        // Recalculate on resize or scroll
        window.addEventListener("resize", calculatePosition)
        window.addEventListener("scroll", calculatePosition)
        
        return () => {
          window.removeEventListener("resize", calculatePosition)
          window.removeEventListener("scroll", calculatePosition)
        }
      }
    }, [open, calculatePosition])
    
    const getAnimationVariants = () => {
      const variants = {
        top: {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 10 },
        },
        bottom: {
          initial: { opacity: 0, y: -10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -10 },
        },
        left: {
          initial: { opacity: 0, x: 10 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 10 },
        },
        right: {
          initial: { opacity: 0, x: -10 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -10 },
        },
      }
      
      return variants[side]
    }
    
    if (!mounted || typeof document === "undefined") {
      return null
    }
    
    // Extract properties that would cause type errors with motion.div
    const safeProps: Omit<HTMLMotionProps<"div">, "ref"> = {
      ...props as any
    }
    
    return createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            className={cn(
              "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
              className
            )}
            initial={getAnimationVariants().initial}
            animate={getAnimationVariants().animate}
            exit={getAnimationVariants().exit}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
            }}
            {...safeProps}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
  }
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
