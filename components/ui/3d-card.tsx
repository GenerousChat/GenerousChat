"use client";

import { cn } from "@/lib/utils";
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from "react";

const MouseEnterContext = createContext<{
  mouseEnter: boolean;
  setMouseEnter: (value: boolean) => void;
}>({
  mouseEnter: false,
  setMouseEnter: () => {},
});

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseEnter, setMouseEnter] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setMouseEnter(true);
  };

  const handleMouseLeave = () => {
    setMouseEnter(false);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <MouseEnterContext.Provider value={{ mouseEnter, setMouseEnter }}>
      <div
        className={cn("flex items-center justify-center perspective-1000", containerClassName)}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          className={cn(
            "flex items-center justify-center relative transition-all duration-200 ease-linear",
            mouseEnter ? `rotate3d-${position.y}-${position.x}-0` : "rotate3d-0-0-0",
            className
          )}
          style={{
            transform: mouseEnter
              ? `rotateY(${position.x}deg) rotateX(${-position.y}deg)`
              : "rotateY(0deg) rotateX(0deg)",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "h-96 w-96 [transform-style:preserve-3d]  [&>*]:[transform-style:preserve-3d]",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Component = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: any;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
}) => {
  const { mouseEnter } = useContext(MouseEnterContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleAnimations();
  }, [mouseEnter]);

  const handleAnimations = () => {
    if (!ref.current) return;
    if (mouseEnter) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = "translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
  };

  return (
    <Component
      ref={ref}
      className={cn("w-fit transition duration-200 ease-linear", className)}
      {...rest}
    >
      {children}
    </Component>
  );
}; 