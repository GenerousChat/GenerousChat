import { cn } from "@/lib/utils";
import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FileTreeProps {
  className?: string;
  children: React.ReactNode;
}

interface FileTreeItemProps {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export function FileTree({ className, children }: FileTreeProps) {
  return (
    <div className={cn("text-sm", className)}>
      {children}
    </div>
  );
}

export function FileTreeItem({ 
  className,
  icon,
  label,
  children,
  defaultOpen = false,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg text-neutral-600 dark:text-neutral-200",
          hasChildren ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800" : "",
        )}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {hasChildren && isOpen && (
        <div className="ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 mt-1">
          {children}
        </div>
      )}
    </div>
  );
} 