"use client";

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  
  // Create message object from searchParams
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
    <>
      <div className="flex flex-col space-y-5 w-full">
        <div className="flex flex-col space-y-2 text-center relative">
          {/* Subtle glow behind the title */}
          <div className="absolute -top-6 left-0 right-0 h-24 bg-primary/5 rounded-full blur-3xl"></div>
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
            Welcome <span className="text-primary">back</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Where conversations spark ideas
          </p>
        </div>

        <form className="grid gap-4 relative z-10">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email" 
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              required
              className="rounded-xl backdrop-blur-sm bg-background/80 border-2 border-muted-foreground/20 dark:border-muted-foreground/30 focus:border-primary/70 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 h-12 px-4 shadow-sm transition-all duration-200"
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
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
              className="rounded-xl backdrop-blur-sm bg-background/80 border-2 border-muted-foreground/20 dark:border-muted-foreground/30 focus:border-primary/70 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 h-12 px-4 shadow-sm transition-all duration-200"
            />
          </div>
          <SubmitButton 
            className="mt-1 h-12 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            pendingText="Signing In..." 
            formAction={signInAction}
          >
            Sign in <ArrowRight className="ml-2 h-4 w-4" />
          </SubmitButton>
          
          {/* Improved "New here?" section */}
          <div className="mt-4 p-3 rounded-lg border border-primary/10 bg-primary/5 backdrop-blur-sm shadow-sm flex items-center justify-between group hover:bg-primary/10 transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                <UserPlus size={16} className="text-primary" />
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">New here?</span>
              </p>
            </div>
            <Link 
              href="/sign-up" 
              className="shrink-0 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Sign up
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </form>

        {message && <FormMessage message={message} />}
      </div>
    </>
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
