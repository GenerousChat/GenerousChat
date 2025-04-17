"use client";

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    <>
      {/* Remove the separate background image div if present */}
      
      {/* Use space-y-4 like sign-in */}
      <div className="flex flex-col space-y-4 w-full relative z-10">
        {/* Title section - Stacked with logo */}
        <div className="flex flex-col space-y-2">
          {/* Updated H1 for responsive text/logo */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight relative flex flex-col items-center gap-1">
            {/* Mobile view: Stacked text + logo */} 
            <span className="md:hidden">Create a</span>
            <img src="/logo.svg" alt="Generous Logo" className="h-16 dark:invert dark:brightness-200 md:hidden" /> 
            <span className="text-primary md:hidden">account</span>
            {/* Desktop view: Simple text - Added text-center */}
            <span className="hidden md:inline-block text-center">Create an <span className="text-primary">account</span></span>
          </h1>
        </div>

        {/* Form section - Ensure gap-4 and no padding */}
          <form className="grid gap-4 rounded-xl bg-background">
            {/* Email Input - Make label visible */}
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
                // Match sign-in input style
                className="rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 h-11 px-4 focus:ring-primary/40 focus:border-primary/40 focus:ring-2"
              />
            </div>
            
            {/* Password Input - Make label visible and match structure */}
            <div className="grid gap-2">
              {/* Add flex container to match sign-in structure */}
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {/* Empty span as placeholder for alignment consistency */}
                <span></span> 
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
                // Match sign-in input style
                className="rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 h-11 px-4 focus:ring-primary/40 focus:border-primary/40 focus:ring-2"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            
            {/* Submit Button - Match sign-in style */}
            <div>
              <SubmitButton
                className="w-full h-11 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground/10"
                formAction={signUpAction}
                pendingText="Creating account..."
              >
                Create account <ArrowRight className="ml-2 h-4 w-4" />
              </SubmitButton>
            </div>
          </form>
      
        {/* "Already have an account?" link */}
        <div className="text-center">
          <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </div>

        {/* Message section */}
        {message && (
              <FormMessage message={message} />
        )}
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
          Create an <span className="text-primary">account</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Loading...
        </p>
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
