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
            {/* Radial gradient for the background */}
            <div className="fixed inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background to-background" />
              <div className="absolute left-[50%] top-0 -z-10 -translate-x-1/2 blur-3xl" aria-hidden="true">
                <div
                  className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#80caff] to-[#4f46e5] opacity-20 dark:from-[#1d4ed8] dark:to-[#7c3aed] dark:opacity-30"
                  style={{
                    clipPath:
                      'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                  }}
                />
              </div>
            </div>

            {/* Header */}
            <nav className="sticky top-0 z-50 w-full h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container h-full flex items-center justify-between">
                <Link 
                  href="/" 
                  className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
                >
                  <BackgroundGradient className="rounded-lg p-0.5 bg-gradient-to-r from-primary/80 to-primary/40">
                    <div className="rounded-lg bg-background p-2">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                  </BackgroundGradient>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Generous
                  </span>
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
