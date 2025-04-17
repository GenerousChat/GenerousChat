"use client";

import Link from "next/link";

export default function ConditionalLogo() {
  return (
    <Link 
      href="/sign-in" 
      className="flex items-center gap-2 pt-3 pb-2 px-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
    >
      <img src="/logo.svg" alt="Logo" className="h-12 dark:invert dark:brightness-200" />
    </Link>
  );
} 