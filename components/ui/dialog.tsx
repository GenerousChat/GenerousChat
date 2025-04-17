"use client";

import * as React from "react"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { X } from "lucide-react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

function Dialog({ 
  open = false, 
  onOpenChange, 
  children 
}: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(open)
  
  React.useEffect(() => {
    setInternalOpen(open)
  }, [open])
  
  const handleOpenChange = React.useCallback((value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }, [onOpenChange])
  
  return (
    <DialogContext.Provider 
      value={{ open: internalOpen, onOpenChange: handleOpenChange }}
    >
      {children}
    </DialogContext.Provider>
  )
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function DialogTrigger({ 
  className,
  children, 
  asChild,
  ...props 
}: DialogTriggerProps) {
  const { onOpenChange } = React.useContext(DialogContext)
  
  if (asChild && React.isValidElement(children)) {
    const childProps = React.isValidElement(children) 
      ? children.props as { onClick?: (e: React.MouseEvent) => void }
      : {}
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      onOpenChange(true)
      if (childProps.onClick) {
        childProps.onClick(e)
      }
    }
    
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>)
  }
  
  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  )
}

type DialogOverlayProps = HTMLMotionProps<"div">

type DialogContentMotionProps = Omit<HTMLMotionProps<"div">, "transition" | "children"> & {
  children: React.ReactNode
}

interface DialogContentProps extends Omit<DialogContentMotionProps, "onClick"> {
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function DialogContent({ 
  className,
  children,
  onClick,
  ...props
}: DialogContentProps) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!mounted || typeof document === "undefined") {
    return null
  }
  
  const safeProps: Omit<HTMLMotionProps<"div">, "transition" | "children"> = {
    ...props as any
  }
  
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "w-full max-w-lg p-6 border bg-background sm:rounded-lg",
                className
              )}
              onClick={onClick}
              {...safeProps}
            >
              {children}
              <button
                className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
