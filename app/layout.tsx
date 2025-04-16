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
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Space_Grotesk } from 'next/font/google'
 
// If loading a variable font, you don't need to specify the font weight
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
})

import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Generous - a Collaborative Development Canvas",
  description: "Build applications visually with your team and AI assistance in real-time.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return (
    <html lang="en" className={spaceGrotesk.className} suppressHydrationWarning>
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
              <div className="h-full grid grid-cols-3 items-center">
                <div className="flex justify-start">
                  <Link 
                    href="/" 
                    className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
                  >
                      <img src="/logo.svg" alt="Logo" className="h-26" />
                  </Link>
                </div>
                <div className="flex justify-center items-center">
                  <Breadcrumbs />
                </div>
                <div className="flex justify-end items-center gap-2">
                  {/* Desktop navigation - hidden on mobile */}
                  <div className="hidden md:flex md:items-center md:gap-4">
                    <ThemeSwitcher />
                    <HeaderAuth />
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
