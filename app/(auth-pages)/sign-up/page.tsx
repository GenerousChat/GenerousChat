"use client";

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LogIn } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new Generous account to start collaborating with your team on visual development.",
};

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
    <div className="flex flex-col space-y-6 w-full">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
          Create an <span className="text-primary">account</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to get started
        </p>
      </div>

      <div>
        <form className="grid gap-4 p-4 sm:p-5 rounded-xl bg-background/95">
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
              className="rounded-xl bg-background/80 border-2 h-11 px-4"
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
              className="rounded-xl bg-background/80 border-2 h-11 px-4"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          </div>
          
          <div>
            <SubmitButton
              className="w-full h-11 rounded-xl font-medium"
              formAction={signUpAction}
              pendingText="Creating account..."
            >
              Create account <ArrowRight className="ml-2 h-4 w-4" />
            </SubmitButton>
          </div>
        </form>
      </div>
      
      {/* "Already have an account?" section */}
      <div>
        <Link href="/sign-in" className="block">
          <button className="w-full p-4 rounded-lg border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center">
                <LogIn size={16} />
              </div>
              <p className="text-sm">
                <span>Already have an account?</span>
                <span className="ml-2 font-medium">Sign in</span>
              </p>
            </div>
            <ArrowRight size={16} />
          </button>
        </Link>
      </div>

      {message && (
        <div>
          <FormMessage message={message} />
        </div>
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
