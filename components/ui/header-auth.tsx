'use client';

import { useEffect, useRef } from 'react';
import { signOutAction } from "@/app/actions";
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./button";
import { UserCircle, LogOut, Github } from "lucide-react";
import type { User } from '@supabase/supabase-js';

interface AuthButtonProps {
  user: User | null;
}

export default function AuthButton({ user }: AuthButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigateToProfile = () => {
    router.push('/profile');
  };

  const isMainPage = pathname === '/';
  const isAboutPage = pathname === '/about';

  const gapClass = isMainPage || isAboutPage ? 'gap-4' : 'gap-2';

  return (
    <div className={`relative flex items-center ${gapClass}`}>
      {/* Conditional About Link (Main Page Only) */}
      {isMainPage && (
        <Button asChild variant="link" className="text-sm font-medium text-muted-foreground hover:text-foreground px-0">
          <Link href="/about">About</Link>
        </Button>
      )}

      {/* User-specific buttons */} 
      {user ? (
        // Logged In State
        <div className="flex items-center gap-2">
          <Button 
            id="user-profile-button"
            variant="ghost" 
            className="flex items-center gap-1.5 px-3 py-1 h-9 text-sm bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full"
            aria-label="Go to profile"
            onClick={handleNavigateToProfile}
          >
            <UserCircle className="h-4 w-4 flex-shrink-0 text-foreground" />
            <span>{user.email}</span>
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
        </div>
      ) : (
        // Logged Out State
        // Conditionally render Sign In/Up buttons ONLY IF NOT on About page
        !isAboutPage && (
          <div className="flex gap-2">
            <Button asChild size="sm" variant={"outline"}>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm" variant={"ghost"}>
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        )
      )}

      {/* Conditional GitHub Icon Link (About Page Only) */}
      {isAboutPage && (
        <Link 
          href="https://github.com/GenerousChat/Generous" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="View source code on GitHub"
        >
          <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground">
            <Github className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
