import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from 'next/link';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Generous | Build Together",
  description: "Build applications visually with your team and AI assistance in real-time. Get started with Generous today.",
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="relative flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background image - responsive and slightly extended left */}
      <div className="absolute inset-0 w-full h-full">
        <Image 
          src="/Images/Robohand.png"
          alt="Background"
          fill
          priority
          className="object-cover md:object-[center_50%] object-[center_35%] scale-x-105"
          sizes="(max-width: 768px) 105vw, 105vw"
          quality={100}
        />
      </div>
      
      {/* Centered logo for mobile only */}
      <div className="absolute inset-0 z-10 flex items-center justify-center md:hidden">
        <Image
          src="/logo.svg"
          alt="Generous Logo"
          width={250} 
          height={80} 
          className="object-contain drop-shadow-lg dark:invert dark:brightness-200"
        />
      </div>

      {/* Bottom-left logo for desktop only */}
      <div className="absolute bottom-8 left-8 z-10 hidden md:block">
        <Image
          src="/logo.svg"
          alt="Generous Logo"
          width={200} 
          height={64} 
          className="object-contain opacity-80 hover:opacity-100 transition-opacity duration-300 dark:invert dark:brightness-200"
        />
      </div>

      {/* Bottom-right GitHub icon link */}
      <Link 
        href="https://github.com/GenerousChat/Generous" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="View source code on GitHub"
        className="absolute bottom-8 right-8 z-10"
      >
        <Button variant="ghost" size="icon" className="w-10 h-10 text-muted-foreground/70 hover:text-foreground/90 hover:bg-muted/50 transition-all duration-300 rounded-full">
          <Github className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}
