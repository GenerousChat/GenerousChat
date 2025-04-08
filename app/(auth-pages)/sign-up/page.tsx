"use client";

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LogIn } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

function SignupForm() {
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

  if (message && "message" in message) {
    return (
      <div className="w-full flex-1 flex items-center justify-center gap-2 p-4">
        <FormMessage message={message} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 text-center relative">
          {/* Subtle glow behind the title */}
          <div className="absolute -top-6 left-0 right-0 h-24 bg-primary/5 rounded-full blur-3xl"></div>
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
            Create an <span className="text-primary">account</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Enter your email to get started
          </p>
        </div>

        <form className="grid gap-3">
          <div className="grid gap-2">
            <Label className="sr-only" htmlFor="email">Email</Label>
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
          <div className="grid gap-2">
            <Label className="sr-only" htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
              className="rounded-xl backdrop-blur-sm bg-background/80 border-2 border-muted-foreground/20 dark:border-muted-foreground/30 focus:border-primary/70 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 h-12 px-4 shadow-sm transition-all duration-200"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          </div>
          <SubmitButton
            className="w-full"
            formAction={signUpAction}
            pendingText="Creating account..."
          >
            Create account
          </SubmitButton>
          
          {/* Styled "Already have an account?" section matching the sign-in page */}
          <div className="mt-4 p-3 rounded-lg border border-primary/10 bg-primary/5 backdrop-blur-sm shadow-sm flex items-center justify-between group hover:bg-primary/10 transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                <LogIn size={16} className="text-primary" />
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">Already have an account?</span>
              </p>
            </div>
            <Link 
              href="/sign-in" 
              className="shrink-0 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Sign in
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </form>

        {message && <FormMessage message={message} />}
      </div>
    </div>
  );
}

// Fallback component for Suspense
function FallbackLoading() {
  return (
    <div>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 text-center relative">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
            Create an <span className="text-primary">account</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <SignupForm />
    </Suspense>
  );
}
