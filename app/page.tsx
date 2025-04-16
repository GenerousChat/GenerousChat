import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import HeaderAuth from "@/components/ui/header-auth";

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
      {/* HeaderAuth for Desktop Homepage Only */}
      {/* Positioned absolutely, leaving space for ThemeSwitcher (right-4) */}
      <div className="fixed top-4 right-16 z-50 hidden md:block">
        <HeaderAuth />
      </div>
      
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
          src="/Images/Generous_Logo.png"
          alt="Generous Logo"
          width={250} 
          height={80} 
          className="object-contain drop-shadow-lg"
        />
      </div>

      {/* Bottom-left logo for desktop only */}
      <div className="absolute bottom-8 left-8 z-10 hidden md:block">
        <Image
          src="/Images/Generous_Logo.png"
          alt="Generous Logo"
          width={200} 
          height={64} 
          className="object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
        />
      </div>
    </div>
  );
}
