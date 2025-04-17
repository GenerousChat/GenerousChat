'use client';

import { useEffect, useRef } from 'react';
import { signOutAction } from "@/app/actions";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./button";
import { UserCircle, LogOut } from "lucide-react";
import type { User } from '@supabase/supabase-js';

interface AuthButtonProps {
  user: User | null;
}

export default function AuthButton({ user }: AuthButtonProps) {
  const router = useRouter();

  const handleNavigateToProfile = () => {
    router.push('/profile');
  };

  return user ? (
    <div className="relative flex items-center gap-2">
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
