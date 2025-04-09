"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hidden md:flex md:items-center md:justify-center w-9 h-9 rounded-full"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? (
        <Sun className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
