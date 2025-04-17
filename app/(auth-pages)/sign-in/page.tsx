"use client";

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  
  const messageFromParams = (): Message | undefined => {
    if (!searchParams) return undefined;
    
    if (searchParams.has('success')) {
      return { success: searchParams.get('success') || '' };
    }
    if (searchParams.has('error')) {
      return { error: searchParams.get('error') || '' };
    }
    if (searchParams.has('message')) {
      return { message: searchParams.get('message') || '' };
    }
    return undefined;
  };
  
  // Ensure component is mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null; // Return null on server-side rendering
  }

  const message = messageFromParams();
  return (
    <div className="flex flex-col space-y-4 w-full relative z-10 font-sans">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight relative flex flex-col items-center gap-2">
          <span className="md:hidden">Welcome to</span> 
          <img src="/logo.svg" alt="Generous Logo" className="h-16 dark:invert dark:brightness-200 md:hidden" /> 
          <span className="hidden md:inline-block">Welcome</span>
        </h1>
      </div>
      <form className="grid gap-4 relative z-10 rounded-xl bg-background space-grotesk">
        <div className="grid gap-2">
          <Label htmlFor="email" className="font-medium">Email</Label>
          <Input
            id="email"
            name="email" 
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            required
            className="rounded-xl bg-gray-100 dark:bg-gray-800 h-11 px-4 focus:ring-primary/40 focus:border-primary/40 focus:ring-2 space-grotesk"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-medium">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors space-grotesk"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="rounded-xl bg-gray-100 dark:bg-gray-800 h-11 px-4 focus:ring-primary/40 focus:border-primary/40 focus:ring-2 space-grotesk"
          />
          <p className="text-xs text-transparent select-none">Must be at least 6 characters</p>
        </div>
        
        <div>
          <SubmitButton 
            className="w-full h-11 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground/10 space-grotesk"
            pendingText="Signing In..." 
            formAction={signInAction}
          >
            Sign in <ArrowRight className="ml-2 h-4 w-4" />
          </SubmitButton>
        </div>
      </form>
      <div className="text-center"> 
        <Link href="/sign-up" className="text-sm font-medium text-primary hover:underline space-grotesk">
          New here? Sign up
        </Link>
      </div>

      {message && (
        <FormMessage message={message} />
      )}
    </div>
  );
}

// Fallback component for Suspense
function FallbackLoading() {
  return (
    <div className="flex flex-col space-y-5 w-full">
      <div className="flex flex-col space-y-2 text-center relative">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
          Welcome <span className="text-primary">back</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <LoginForm />
    </Suspense>
  );
}
