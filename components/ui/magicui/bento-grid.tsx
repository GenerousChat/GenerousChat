import { cn } from "@/lib/utils";
import React from "react";

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

interface BentoGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  title: string;
  description: string;
  header: React.ReactNode;
  icon?: React.ReactNode;
}

export function BentoGrid({
  className,
  children,
  ...props
}: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  ...props
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
        className
      )}
      {...props}
    >
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {header}
      </div>
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        <div className="font-sans font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">
          {icon && <span className="mr-2 inline-block">{icon}</span>}
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-600 text-sm dark:text-neutral-300">
          {description}
        </div>
      </div>
    </div>
  );
} 