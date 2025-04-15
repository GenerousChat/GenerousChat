import HeaderAuth from "@/components/ui/header-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { createClient } from "@/utils/supabase/server";
import { TTSProvider } from "@/utils/tts-context";
import { SpeakingProvider } from "@/utils/speaking-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Generous - a Collaborative Development Canvas",
  description: "Build applications visually with your team and AI assistance in real-time.",
};

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TTSProvider>
            <SpeakingProvider>
          <main className="relative min-h-screen flex flex-col overflow-hidden isolate">
        

            {/* Header */}
            <nav className="sticky top-0 z-50 w-full h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container h-full flex items-center justify-between">
                <Link 
                  href="/" 
                  className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
                >
                    <div className="rounded-lg bg-background p-2">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    Generous
                </Link>
                
                <div className="flex items-center gap-2">
                  {/* Desktop navigation - hidden on mobile */}
                  <div className="hidden md:flex md:items-center md:gap-4">
                    <HeaderAuth />
                    <ThemeSwitcher />
                  </div>
                </div>
              </div>
            </nav>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </main>
            </SpeakingProvider>
          </TTSProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
