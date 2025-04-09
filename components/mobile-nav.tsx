"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, X, Sun, Moon, LogIn, LogOut, UserCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { motion, AnimatePresence } from "framer-motion";
import { BlurFade } from "@/components/ui/magicui/blur-fade";

interface MobileNavProps {
  user: any | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };
  
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="relative w-9 h-9 rounded-full hover:bg-primary/10 transition-colors"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-primary" />
        ) : (
          <Menu className="h-5 w-5 text-primary" />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
              onClick={closeMenu}
              aria-hidden="true"
            />
            
            {/* Menu Panel */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 right-0 z-[101] flex flex-col h-[100dvh] bg-background dark:bg-background border-r border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full hover:bg-destructive/10 transition-colors"
                  onClick={closeMenu}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
              
              {/* Menu content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-md mx-auto p-4 space-y-4">
                  {/* Theme toggle */}
                  <BlurFade delay={0.1} className="w-full">
                    <BackgroundGradient 
                      className="p-[1px] rounded-xl overflow-hidden"
                      gradientClassName="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 dark:from-primary/20 dark:via-primary/15 dark:to-primary/5"
                    >
                      <div className="bg-card dark:bg-card backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {theme === "light" ? (
                              <div className="p-2 rounded-full bg-amber-500/10">
                                <Sun className="h-5 w-5 text-amber-500" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-full bg-indigo-400/10">
                                <Moon className="h-5 w-5 text-indigo-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium">{theme === "light" ? "Light" : "Dark"} Mode</h3>
                              <p className="text-xs text-muted-foreground">Change appearance</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-16 h-8 rounded-full border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5"
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                          >
                            <div className="w-full h-full relative flex items-center">
                              <motion.div
                                initial={false}
                                animate={{ x: theme === "light" ? 0 : 20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className="absolute w-4 h-4 rounded-full bg-primary"
                              />
                              <span className="sr-only">Toggle theme</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </BackgroundGradient>
                  </BlurFade>
                  
                  {user ? (
                    <>
                      {/* User email */}
                      <BlurFade delay={0.2} className="w-full">
                        <BackgroundGradient 
                          className="p-[1px] rounded-xl overflow-hidden"
                          gradientClassName="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 dark:from-primary/20 dark:via-primary/15 dark:to-primary/5"
                        >
                          <div className="bg-card dark:bg-card backdrop-blur-sm rounded-xl p-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm text-muted-foreground">
                                Signed in as:
                              </div>
                              <div className="text-base font-medium truncate text-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </BackgroundGradient>
                      </BlurFade>
                      
                      {/* Actions */}
                      <BlurFade delay={0.3} className="w-full">
                        <BackgroundGradient 
                          className="p-[1px] rounded-xl overflow-hidden"
                          gradientClassName="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 dark:from-primary/20 dark:via-primary/15 dark:to-primary/5"
                        >
                          <div className="bg-card dark:bg-card backdrop-blur-sm rounded-xl p-2">
                            {/* Profile button */}
                            <Link href="/profile" onClick={closeMenu}>
                              <div className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserCircle className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <span className="text-base font-medium">Profile</span>
                                    <p className="text-xs text-muted-foreground">Manage your account settings</p>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </Link>
                          </div>
                        </BackgroundGradient>
                      </BlurFade>
                    </>
                  ) : (
                    <BlurFade delay={0.2} className="w-full">
                      <BackgroundGradient 
                        className="p-[1px] rounded-xl overflow-hidden"
                        gradientClassName="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 dark:from-primary/20 dark:via-primary/15 dark:to-primary/5"
                      >
                        <div className="bg-card dark:bg-card backdrop-blur-sm rounded-xl p-2">
                          {/* Sign in button */}
                          <Link href="/sign-in" onClick={closeMenu}>
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer group mb-1">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10 flex items-center justify-center">
                                  <LogIn className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <span className="text-base font-medium">Sign in</span>
                                  <p className="text-xs text-muted-foreground">Access your account</p>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </Link>
                          
                          {/* Sign up button */}
                          <Link href="/sign-up" onClick={closeMenu}>
                            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15 rounded-lg transition-colors cursor-pointer group">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/20 flex items-center justify-center">
                                  <UserCircle className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <span className="text-base font-medium text-primary">Sign up</span>
                                  <p className="text-xs text-muted-foreground">Create a new account</p>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </Link>
                        </div>
                      </BackgroundGradient>
                    </BlurFade>
                  )}
                </div>
              </div>

              {/* Footer with Sign Out (only shown when user is logged in) */}
              {user && (
                <div className="border-t border-border p-4 bg-muted/40 backdrop-blur-sm">
                  <BlurFade delay={0.4}>
                    <form action={signOutAction}>
                      <Button 
                        type="submit" 
                        variant="ghost" 
                        className="w-full justify-between text-base px-4 py-3 h-auto hover:bg-destructive/5 rounded-lg transition-colors group bg-background/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-destructive/10 flex items-center justify-center">
                            <LogOut className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <span className="font-medium">Sign out</span>
                            <p className="text-xs text-muted-foreground">Log out from your account</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </form>
                  </BlurFade>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 