import { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamSection } from "@/components/about/team-section";

export const metadata: Metadata = {
  title: "About Generous",
  description: "Meet the team behind Generous and learn about our mission.",
};

export default function AboutPage() {
  return (
    <div className="relative flex flex-col items-center justify-center h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-muted/20 via-background to-background p-6 md:p-8">
      
      <div className="container z-10 flex flex-col items-center justify-center h-full max-w-6xl mx-auto text-center space-y-6 md:space-y-8">

        <Image
          src="/logo.svg"
          alt="Generous Logo"
          width={200} 
          height={64} 
          className="object-contain mb-2 md:mb-4 dark:invert dark:brightness-150 opacity-90"
          priority
        />

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text">
          Build Together.
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-3xl">
          Generous is a real-time, AI-enhanced platform empowering teams to collaboratively design and build immersive virtual experiences with intuitive visualizations tools and AI agents.
        </p>

        <TeamSection />

        {/* Built Using Section - Updated with Logos */}
        <section className="pt-4 md:pt-6 border-t border-border/20 w-full max-w-4xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">Built Using</h3>
          {/* Logos container - Increased gap */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 md:gap-x-10">
            {/* Supabase Logo - Made Smaller */}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" aria-label="Supabase">
              <Image 
                src="/Sponsors/supabase-logo-wordmark--dark.png" 
                alt="Supabase Logo" 
                width={90} // Reduced width
                height={24} // Reduced height
                className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" // Reduced height class to h-6
              />
            </a>
            
            {/* Cursor Logo - Made Smaller */}
            <a href="https://cursor.sh" target="_blank" rel="noopener noreferrer" aria-label="Cursor">
              <Image 
                src="/Sponsors/cursor-text.svg" 
                alt="Cursor Logo" 
                width={75} // Reduced width
                height={24} // Reduced height
                className="h-6 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" // Reduced height class to h-6
              />
            </a>

            {/* Windsurf Logo */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Windsurf"> {/* Update href if available */} 
              <Image 
                src="/Sponsors/windsurf_logo_white_wordmark.svg" 
                alt="Windsurf Logo" 
                width={130} // Adjusted width 
                height={32} // Increased height
                className="h-7 w-auto object-contain invert dark:invert-0 opacity-80 hover:opacity-100 transition-opacity" // Increased height class to h-7
              />
            </a>
            
            {/* Vercel Logo - Made Significantly Larger */}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" aria-label="Vercel">
              <Image 
                src="/Sponsors/vercel-svgrepo-com.svg" 
                alt="Vercel Logo" 
                width={190} // Significantly increased width
                height={64}  // Significantly increased height
                className="h-16 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" // Significantly increased height class to h-16
              />
            </a>

            {/* OpenAI Logo (Placeholder Path) - Made White in Dark Mode */}
            <a href="https://openai.com" target="_blank" rel="noopener noreferrer" aria-label="OpenAI">
              <Image 
                src="/Sponsors/OpenAI_Logo.svg.png" // <<< VERIFY/UPDATE THIS PATH
                alt="OpenAI Logo" 
                width={95} // Kept width
                height={32} // Kept height
                className="h-7 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity dark:invert" // Added dark:invert
              />
            </a>

            {/* xAI Logo (Placeholder Path) */}
            <a href="https://x.ai" target="_blank" rel="noopener noreferrer" aria-label="xAI">
              <Image 
                src="/Sponsors/XAI_Logo.svg.png" // <<< VERIFY/UPDATE THIS PATH
                alt="xAI Logo" 
                width={60} // Adjusted width
                height={32} // Increased height
                className="h-8 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" // Increased height class to h-8
              />
            </a>

          </div>
        </section>

      </div>
    </div>
  );
} 