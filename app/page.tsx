import { createClient } from "@/utils/supabase/server";
import { ShinyButton } from "@/components/ui/magicui/shiny-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BlurFade } from "@/components/ui/magicui/blur-fade";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Hero section - Focused and clean */}
      <section className="relative min-h-[85vh] flex items-center py-16 lg:py-24 overflow-hidden">
        <div className="container px-4 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Hero Content - Improved messaging */}
            <div className="text-center lg:text-left">
              <BlurFade delay={0.1}>
                <div className="mb-6 inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  Launching April 17 2025
                </div>
              </BlurFade>
              
              <BlurFade delay={0.2}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                    A Canvas for{" "}
                  <span className="text-primary">
                    Collaborative Development
                  </span>
                </h1>
              </BlurFade>
              
              <BlurFade delay={0.3}>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0">
                  Build applications visually with your team and AI assistance in real-time.
                </p>
              </BlurFade>
              
              <BlurFade delay={0.4}>
                <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
                  <Link href="/sign-in">
                    <ShinyButton className="rounded-md px-8 py-3 text-base shadow-sm hover:shadow bg-primary hover:bg-primary/90 transition-all duration-200 group">
                      <span className="flex items-center">
                        Start Collaborating <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </ShinyButton>
                  </Link>
                </div>
              </BlurFade>
            </div>
            
            {/* Hero Visual - Clean illustration */}
            <BlurFade delay={0.5} className="hidden lg:block">
              <div className="relative p-4 border rounded-xl overflow-hidden shadow-lg bg-gradient-to-b from-background to-background/70">
                <div className="aspect-[5/3] w-full bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                  {/* Simulated canvas interface */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-background/90 border-b flex items-center px-4">
                    <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="flex-1 text-center text-sm font-medium text-muted-foreground">Canvas</div>
                  </div>
                  
                  {/* Canvas content simulation */}
                  <div className="w-4/5 h-4/5 rounded-md border border-dashed border-primary/30 grid grid-cols-2 gap-3 p-6">
                    <div className="h-16 bg-primary/10 rounded-md border border-primary/20 flex items-center justify-center text-sm text-primary">Component A</div>
                    <div className="h-16 bg-primary/10 rounded-md border border-primary/20 flex items-center justify-center text-sm text-primary">Component B</div>
                    <div className="h-16 bg-background rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">API Service</div>
                    <div className="h-16 bg-background rounded-md border border-border flex items-center justify-center text-sm text-muted-foreground">Database</div>
                  </div>
                  
                  {/* Simulated cursors */}
                  <div className="absolute top-1/3 left-1/4 flex flex-col items-center animate-pulse">
                    <div className="w-4 h-4 border-l-2 border-t-2 rotate-45 border-blue-400"></div>
                    <div className="mt-2 px-2 py-1 rounded-md bg-blue-400 text-xs text-white">User 1</div>
                  </div>
                  
                  <div className="absolute bottom-1/3 right-1/4 flex flex-col items-center animate-pulse" style={{animationDelay: '1s'}}>
                    <div className="w-4 h-4 border-l-2 border-t-2 rotate-45 border-green-400"></div>
                    <div className="mt-2 px-2 py-1 rounded-md bg-green-400 text-xs text-white">User 2</div>
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>
    </div>
  );
}
