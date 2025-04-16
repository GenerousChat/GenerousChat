import HeaderAuth from "@/components/ui/header-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { TTSProvider } from "@/utils/tts-context";
import { SpeakingProvider } from "@/utils/speaking-context";
import { Space_Grotesk } from 'next/font/google'
import { Viewport } from 'next'
 
// If loading a variable font, you don't need to specify the font weight
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
})

import "./globals.css";

const defaultUrl = "https://generous.rocks";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
  colorScheme: "dark light",
}

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Generous | Build Together",
    template: "%s | Generous"
  },
  description: "Build applications visually with your team and AI assistance in real-time. Collaborate, prototype, and create together on a shared canvas.",
  keywords: ["collaboration", "development", "canvas", "AI", "prototyping", "real-time", "visual development", "team collaboration", "generous"],
  authors: [{ name: "Generous Team" }],
  creator: "Generous",
  publisher: "Generous",
  applicationName: "Generous",
  referrer: "origin-when-cross-origin",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: defaultUrl,
    title: "Generous | Build Together",
    description: "Build applications visually with your team and AI assistance in real-time",
    siteName: "Generous",
    images: [
      {
        url: `${defaultUrl}/Og_images/OG.png`,
        width: 1200,
        height: 630,
        alt: "Generous | Build Together",
      },
      {
        url: `${defaultUrl}/Og_images/OG_Whatsapp.png`, 
        width: 800,
        height: 800,
        alt: "Generous | Build Together"
      },
      {
        url: `${defaultUrl}/Favicons/android-chrome-512x512.png`,
        width: 512,
        height: 512,
        alt: "Generous Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Generous | Build Together",
    description: "Build applications visually with your team and AI assistance in real-time",
    images: [`${defaultUrl}/Og_images/OG.png`],
    creator: "@generous",
    site: "@generous",
  },
  alternates: {
    canonical: defaultUrl,
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/Favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/Favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/Favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/Favicons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/Favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/Favicons/favicon.ico",
  },
  appleWebApp: {
    title: "Generous",
    statusBarStyle: "black-translucent",
    capable: true,
  },
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
            <nav className="sticky top-0 z-50 w-full h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="h-full grid grid-cols-3 items-center">
                <div className="flex justify-start">
                  <Link 
                    href="/" 
                    className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors"
                  >
                      <img src="/logo.svg" alt="Logo" className="h-26 dark:invert dark:brightness-200" />
                  </Link>
                </div>
                <div className="flex justify-center items-center">
                  <Breadcrumbs />
                </div>
                <div className="flex justify-end items-center gap-2">
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
