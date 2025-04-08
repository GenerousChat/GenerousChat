"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { useInView } from "react-intersection-observer";

export interface BlurFadeProps extends Omit<HTMLMotionProps<"div">, "animate" | "initial" | "transition"> {
  inView?: boolean;
  delay?: number;
}

export function BlurFade({ 
  children, 
  className, 
  inView: forceInView,
  delay = 0,
  ...props 
}: BlurFadeProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const shouldAnimate = forceInView !== undefined ? forceInView : inView;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={
        shouldAnimate
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 0, filter: "blur(10px)" }
      }
      transition={{
        duration: 0.5,
        delay,
        ease: "easeOut",
      }}
      className={cn("", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}