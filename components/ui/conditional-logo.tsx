"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pathsToHideLogo = ["/", "/sign-in", "/sign-up", "/forgot-password"];

export default function ConditionalLogo() {
  const pathname = usePathname();
  // Hide logo on homepage and auth pages
  const shouldHide = pathsToHideLogo.includes(pathname);
  
  if (shouldHide) {
    return null;
  }
  
  return (
    <Link 
      href="/" 
      className="flex items-center gap-2 pt-3 pb-2 px-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
    >
      <img src="/logo.svg" alt="Logo" className="h-12 viewbox-h-16 dark:invert dark:brightness-200" />
    </Link>
  );
} 