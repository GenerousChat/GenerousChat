import * as React from "react";
import { motion, AnimatePresence, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ToastProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  type?: "default" | "success" | "error" | "warning";
  duration?: number;
  onClose?: () => void;
  className?: string;
}

// Create a combined type that explicitly leaves out React's onDrag handler
type CombinedToastProps = ToastProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | keyof ToastProps> & Omit<MotionProps, keyof ToastProps>;

const Toast = React.forwardRef<HTMLDivElement, CombinedToastProps>(
  ({ className, title, description, action, type = "default", onClose, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all",
          type === "success" && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900",
          type === "error" && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900",
          type === "warning" && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900",
          type === "default" && "bg-background border-border",
          className
        )}
        {...props}
      >
        <div className="grid gap-1">
          {title && (
            <div className="text-sm font-semibold">
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
        </div>
        {action}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close toast"
            title="Close toast"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </motion.div>
    );
  }
);
Toast.displayName = "Toast";

interface ToastViewportProps {
  className?: string;
}

const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
          className
        )}
        {...props}
      />
    );
  }
);
ToastViewport.displayName = "ToastViewport";

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastContext = React.createContext<{
  toasts: ToastProps[];
  addToast: (toast: ToastProps) => void;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([]);

  const addToast = React.useCallback((toast: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration || 5000);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport>
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </ToastViewport>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
} 