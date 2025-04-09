"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both";
  scrollHideDelay?: number;
  type?: "auto" | "always" | "scroll" | "hover";
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      orientation = "vertical",
      scrollHideDelay = 600,
      type = "hover",
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const scrollbarRef = React.useRef<HTMLDivElement>(null);
    const [scrollVisible, setScrollVisible] = React.useState(false);
    const [scrollbarHeight, setScrollbarHeight] = React.useState(100);
    const [scrollbarTop, setScrollbarTop] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStartY, setDragStartY] = React.useState(0);
    const [scrollStartY, setScrollStartY] = React.useState(0);
    
    // Combine refs
    const handleRef = (node: HTMLDivElement | null) => {
      if (node) {
        containerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }
    };

    // Calculate scrollbar dimensions
    const updateScrollbar = React.useCallback(() => {
      if (!containerRef.current || !contentRef.current) return;
      
      const container = containerRef.current;
      const content = contentRef.current;
      
      const scrollRatio = container.clientHeight / content.scrollHeight;
      const scrollbarThumbHeight = Math.max(
        scrollRatio * container.clientHeight,
        30
      );
      
      setScrollbarHeight(scrollbarThumbHeight);
      
      const scrollPercentage = container.scrollTop / (content.scrollHeight - container.clientHeight);
      const newScrollbarTop = scrollPercentage * (container.clientHeight - scrollbarThumbHeight);
      
      setScrollbarTop(isNaN(newScrollbarTop) ? 0 : newScrollbarTop);
    }, []);

    // Handle scrolling
    const handleScroll = React.useCallback(() => {
      if (type === "always") {
        updateScrollbar();
        return;
      }
      
      setScrollVisible(true);
      updateScrollbar();
      
      if (type === "scroll" || type === "hover") {
        const timeout = setTimeout(() => {
          setScrollVisible(false);
        }, scrollHideDelay);
        
        return () => clearTimeout(timeout);
      }
    }, [scrollHideDelay, type, updateScrollbar]);

    // Handle mouse down on scrollbar
    const handleScrollbarMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStartY(e.clientY);
      setScrollStartY(containerRef.current?.scrollTop || 0);
    };

    // Handle mouse move for scrollbar drag
    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current || !contentRef.current) return;
        
        const container = containerRef.current;
        const content = contentRef.current;
        const deltaY = e.clientY - dragStartY;
        const scrollRatio = content.scrollHeight / container.clientHeight;
        
        container.scrollTop = scrollStartY + deltaY * scrollRatio;
        updateScrollbar();
      };
      
      const handleMouseUp = () => {
        setIsDragging(false);
      };
      
      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      }
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isDragging, dragStartY, scrollStartY, updateScrollbar]);

    // Handle mouse enter/leave for hover type
    const handleMouseEnter = () => {
      if (type === "hover") {
        setScrollVisible(true);
      }
    };
    
    const handleMouseLeave = () => {
      if (type === "hover" && !isDragging) {
        setScrollVisible(false);
      }
    };

    // Update scrollbar when content changes
    React.useEffect(() => {
      if (containerRef.current && contentRef.current) {
        const resizeObserver = new ResizeObserver(() => {
          updateScrollbar();
        });
        
        resizeObserver.observe(contentRef.current);
        
        return () => {
          resizeObserver.disconnect();
        };
      }
    }, [updateScrollbar]);

    return (
      <div
        ref={handleRef}
        className={cn(
          "relative overflow-hidden",
          orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
          orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
          orientation === "both" && "overflow-auto",
          className
        )}
        onScroll={handleScroll}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div
          ref={contentRef}
          className="h-full w-full rounded-[inherit]"
        >
          {children}
        </div>
        
        {orientation !== "horizontal" && (
          <motion.div
            ref={scrollbarRef}
            className={cn(
              "absolute right-0 top-0 z-50 w-2.5 rounded-lg",
              "transition-opacity duration-200"
            )}
            style={{ opacity: scrollVisible || type === "always" ? 1 : 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: scrollVisible || type === "always" ? 1 : 0 }}
          >
            <motion.div
              className="relative flex-1 rounded-full bg-border hover:bg-border/80 cursor-pointer"
              style={{
                height: scrollbarHeight,
                transform: `translateY(${scrollbarTop}px)`,
              }}
              onMouseDown={handleScrollbarMouseDown}
            />
          </motion.div>
        )}
      </div>
    );
  }
);

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
