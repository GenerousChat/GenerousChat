'use client';

import { useState, useEffect, useRef } from 'react';
import { signOutAction } from "@/app/actions";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./button";
import { UserCircle, LogOut, ChevronDown } from "lucide-react";
import type { User } from '@supabase/supabase-js';

interface AuthButtonProps {
  user: User | null;
}

export default function AuthButton({ user }: AuthButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const toggleDropdown = () => {
    console.log('[HeaderAuth] Toggling dropdown. Current state:', isDropdownOpen, 'New state:', !isDropdownOpen);
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedElement = event.target as Node;
      // console.log('[HeaderAuth] Click detected. Target:', clickedElement);
      
      // Close only if click is outside dropdown AND outside trigger button
      if (dropdownRef.current && !dropdownRef.current.contains(clickedElement) &&
          triggerRef.current && !triggerRef.current.contains(clickedElement)) 
      {
        // console.log('[HeaderAuth] Click OUTSIDE dropdown and trigger. Closing dropdown.'); 
        setIsDropdownOpen(false);
      } else {
        // console.log('[HeaderAuth] Click INSIDE dropdown or on trigger. Doing nothing via outside handler.'); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, triggerRef]);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOutAction();
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    router.push('/profile');
  };

  return user ? (
    <div className="relative flex items-center gap-2">
      <Button 
        id="user-menu-button"
        ref={triggerRef}
        variant="ghost" 
        className="flex items-center gap-1.5 px-3 py-1 h-9 text-sm bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
        aria-label="User menu"
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
      >
        <UserCircle className="h-4 w-4 flex-shrink-0 text-foreground" />
        <span>{user.email}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      <form action={signOutAction} className="flex">
        <Button 
          type="submit" 
          variant="ghost" 
          size="icon" 
          className="flex items-center justify-center w-9 h-9 rounded-full border border-muted hover:border-muted-foreground/50"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4 text-foreground" /> 
        </Button>
      </form>

      {isDropdownOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-50 py-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          <div 
            role="menuitem"
            tabIndex={-1}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent rounded-sm m-1 cursor-pointer"
            onClick={handleProfileClick}
            onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}
          >
            <UserCircle className="h-4 w-4" /> 
            <span>Profile</span>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"ghost"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
