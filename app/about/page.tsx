import { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define team data directly in the server component
const teamMembers = [
  { name: "Thomas Davis", role: "Full Stack Developer", src: "/Avatars/TDavis.png" }, 
  { name: "Lisa Watts", role: "Prompt Engineer", src: "/Avatars/LWatts.png" },
  { name: "John Kappa", role: "Design", src: "/Avatars/JKappa.png" },
  { name: "Traves Theberge", role: "Developer", src: "/Avatars/TTheberge.png" },
];

export const metadata: Metadata = {
  title: "About Generous",
  description: "Meet the team behind Generous and learn about our mission.",
};

export default function AboutPage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-muted/20 via-background to-background p-6 md:p-8">
      
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
          Generous is a real-time, social AI platform empowering teams to collaboratively design and build immersive virtual experiences with intuitive visualization tools and AI agents
        </p>

        {/* Canva Embed Section */}
        <div className="w-full max-w-4xl my-6 md:my-8">
          <div style={{ position: 'relative', width: '100%', height: 0, paddingTop: '56.25%', paddingBottom: 0, boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)', marginTop: '1.6em', marginBottom: '0.9em', overflow: 'hidden', borderRadius: '8px', willChange: 'transform' }}>
            <iframe 
              loading="lazy" 
              style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, border: 'none', padding: 0, margin: 0 }}
              src="https://www.canva.com/design/DAGk4XrJ4uw/BnBGoqY4P1ZIWltql4Psyg/watch?embed"
              allowFullScreen 
              allow="fullscreen"
              title="Canva Presentation Embed"
            />
          </div>
        </div>

        {/* Team Section */}
        <section className="text-center pt-4 md:pt-6">
          <h2 className="text-2xl font-semibold mb-4 md:mb-6">Meet the Team</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {teamMembers.map((member) => (
              <div key={member.name} className="flex flex-col items-center space-y-2">
                {/* Standard img tag with Tailwind styling */}
                <img 
                  src={member.src}
                  alt={member.name}
                  width={96} // Set explicit width for layout
                  height={96} // Set explicit height for layout
                  loading="lazy" // Add lazy loading 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-primary/50 shadow-lg object-cover"
                />
                <span className="font-medium text-foreground pt-1">{member.name}</span>
                <span className="text-sm text-muted-foreground">{member.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Built Using Section - Updated with Logos */}
        <section className="pt-4 md:pt-6 border-t border-border/20 w-full max-w-4xl">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">Built Using</h3>
          {/* Logos container - Increased gap */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 md:gap-x-10">
            
            {/* Supabase Logo - Light/Dark Mode (Corrected Swap) */}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" aria-label="Supabase">
              {/* Light Mode Logo (Uses --light SVG, hidden in dark) */}
              <Image 
                src="/Sponsors/supabase-logo-wordmark--light.svg"
                alt="Supabase Logo (Light Mode)" 
                width={90} 
                height={24} 
                className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity dark:hidden"
              />
              {/* Dark Mode Logo (Uses --dark SVG, shown only in dark) */}
              <Image 
                src="/Sponsors/supabase-logo-wordmark--dark.svg"
                alt="Supabase Logo (Dark Mode)" 
                width={90} 
                height={24} 
                className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity hidden dark:block"
              />
            </a>
            
            {/* Cursor Logo - Made Smaller Again */}
            <a href="https://cursor.sh" target="_blank" rel="noopener noreferrer" aria-label="Cursor">
              <Image 
                src="/Sponsors/cursor-text.svg" 
                alt="Cursor Logo" 
                width={65} 
                height={20} 
                className="h-5 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" 
              />
            </a>

            {/* Windsurf Logo */}
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Windsurf"> {/* Update href if available */} 
              <Image 
                src="/Sponsors/windsurf_logo_white_wordmark.svg" 
                alt="Windsurf Logo" 
                width={130} 
                height={32} 
                className="h-7 w-auto object-contain invert dark:invert-0 opacity-80 hover:opacity-100 transition-opacity" 
              />
            </a>
            
            {/* Vercel Logo - Made Significantly Larger */}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" aria-label="Vercel">
              <Image 
                src="/Sponsors/vercel-svgrepo-com.svg" 
                alt="Vercel Logo" 
                width={190} 
                height={64}  
                className="h-16 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" 
              />
            </a>

            {/* Next.js Logo - Added */}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" aria-label="Next.js">
              <Image 
                src="/Sponsors/nextjs.svg" 
                alt="Next.js Logo" 
                width={90} // Adjust size as needed
                height={28} 
                className="h-7 w-auto object-contain dark:invert opacity-80 hover:opacity-100 transition-opacity" 
              />
            </a>

            {/* OpenAI Logo (Placeholder Path) - Made Smaller */}
            <a href="https://openai.com" target="_blank" rel="noopener noreferrer" aria-label="OpenAI">
              <Image 
                src="/Sponsors/OpenAI_Logo.svg.png" // <<< VERIFY/UPDATE THIS PATH
                alt="OpenAI Logo" 
                width={75} 
                height={24} 
                className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity dark:invert" 
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