"use client";

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoginForm() {
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

  const message = messageFromParams();
  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Sign in to your account to continue</p>
      </div>
      
      <form className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
          <Input
            id="email"
            name="email" 
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            required
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-gray-500 hover:text-primary transition-colors"
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
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div className="pt-2">
          <SubmitButton 
            className="w-full h-10 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 shadow-sm transition-all duration-200"
            pendingText="Signing In..." 
            formAction={signInAction}
          >
            Sign in <ArrowRight className="ml-2 h-4 w-4" />
          </SubmitButton>
        </div>
      </form>
      
      <div className="text-center pt-2"> 
        <Link href="/sign-up" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">
          Don't have an account? <span className="text-primary">Sign up</span>
        </Link>
      </div>

      {message && (
        <FormMessage message={message} />
      )}
    </div>
  );
}

function FallbackLoading() {
  return (
    <div className="flex flex-col space-y-4 w-full relative z-10 font-sans">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
        </h1>
        <Skeleton className="h-16 w-24 mx-auto md:hidden" />
      </div>
      <div className="grid gap-4 rounded-xl bg-background">
        <div className="grid gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
      <div className="text-center"> 
        <Skeleton className="h-5 w-28 mx-auto" />
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
