"use client";

import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ForgotPasswordForm() {
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
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] pt-16">
      <div className="flex flex-col space-y-2 text-center relative">
        {/* Subtle glow behind the title */}
        <div className="absolute -top-6 left-0 right-0 h-24 bg-primary/5 rounded-full blur-3xl"></div>
        
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
          Reset <span className="text-primary">Password</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <div className="grid gap-6">
        <form className="grid gap-4">
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
            />
          </div>
          <SubmitButton 
            className="w-full"
            formAction={forgotPasswordAction}
          >
            Send Reset Link
          </SubmitButton>
        </form>
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link 
          href="/sign-in"
          className="hover:text-primary underline underline-offset-4 transition-colors"
        >
          Sign in
        </Link>
      </p>

      {message && <FormMessage message={message} />}
    </div>
  );
}

// Fallback component for Suspense
function FallbackLoading() {
  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] pt-16">
      <div className="flex flex-col space-y-2 text-center relative">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
          Reset <span className="text-primary">Password</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
