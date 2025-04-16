"use client";

import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BlurFade } from "@/components/ui/magicui/blur-fade";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { ArrowRight, LogIn } from "lucide-react";
import Image from "next/image";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";


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
    <>
      {/* Background image - positioned absolutely within the auth layout card */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden -z-10">
        <Image
          src="/Images/Walking.png"
          alt="Background"
          fill
          sizes="(max-width: 450px) 100vw, 450px"
          className="object-cover object-center opacity-15 dark:opacity-10"
          priority
        />
      </div>
      
      <div className="flex flex-col space-y-6 w-full relative z-10">
        <BlurFade delay={0.1} className="flex flex-col space-y-2 text-center">
          {/* Subtle glow behind the title */}
          <div className="absolute -top-6 left-0 right-0 h-24 bg-primary/5 rounded-full blur-3xl"></div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight relative">
            Reset <span className="text-primary">Password</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </BlurFade>

        <BackgroundGradient className="p-[1px] rounded-xl overflow-hidden">
          <form className="grid gap-4 p-4 sm:p-5 rounded-xl bg-background/95 backdrop-blur-sm">
            <BlurFade delay={0.2} className="grid gap-2">
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
                className="rounded-xl backdrop-blur-sm bg-background/80 border-2 border-muted-foreground/20 dark:border-muted-foreground/30 focus:border-primary/70 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 h-11 px-4 shadow-sm transition-all duration-200"
              />
            </BlurFade>
            
            <BlurFade delay={0.3}>
              <SubmitButton 
                className="w-full h-11 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white dark:text-primary-foreground"
                formAction={forgotPasswordAction}
              >
                Send Reset Link <ArrowRight className="ml-2 h-4 w-4" />
              </SubmitButton>
            </BlurFade>
          </form>
        </BackgroundGradient>

        {/* "Remember your password?" section - simplified to text link */}
        <BlurFade delay={0.4} className="text-center">
          <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
            Remember your password? Sign in
          </Link>
        </BlurFade>

        {message && (
          <BlurFade delay={0.5}>
            <FormMessage message={message} />
          </BlurFade>
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
