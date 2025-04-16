import { Metadata } from "next";
import { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
  colorScheme: "dark light"
};

const defaultUrl = "https://generous.rocks";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Sign in, sign up, or reset your password for your Generous account.",
  openGraph: {
    title: "Authentication | Generous",
    description: "Sign in, sign up, or reset your password for your Generous account.",
    type: "website",
    siteName: "Generous",
    images: [{
      url: `${defaultUrl}/Og_images/OG.png`,
      width: 1200,
      height: 630,
      alt: "Authentication | Generous",
    }],
  },
  twitter: {
    card: "summary",
    title: "Authentication | Generous",
    description: "Sign in, sign up, or reset your password for your Generous account.",
    images: [`${defaultUrl}/Og_images/OG.png`],
  },
  robots: {
    index: false,
    follow: true,
  }
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8">
      {/* Decorative elements */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-3xl opacity-50" />
      </div>
      
      <div className="absolute pointer-events-none -bottom-40 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute pointer-events-none -top-40 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Card */}
      <div className="w-full max-w-[450px] relative z-10">
        <div className="w-full bg-background/60 backdrop-blur-lg rounded-2xl shadow-xl p-5 sm:p-8 border border-primary/10">
          {children}
        </div>
      </div>
    </div>
  );
}
