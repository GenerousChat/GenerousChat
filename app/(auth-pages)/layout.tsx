import { Metadata } from "next";
import { Viewport } from "next";
import Image from "next/image";

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
    <div className="relative min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background image - Changed to Walking.png and centered */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Images/Walking.png"
          alt="Background"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          quality={100}
        />
      </div>
      
      {/* Card container */}
      <div className="w-full max-w-[450px] relative z-10 mb-20 md:mb-0">
        <div className="w-full bg-white dark:bg-black rounded-2xl shadow-xl p-6 sm:p-10">
          {children}
        </div>
      </div>

      {/* Top-left logo for desktop only */}
      <div className="absolute top-8 left-8 z-10 hidden md:block">
        <Image
          src="/Images/Generous_Logo.png"
          alt="Generous Logo"
          width={200}
          height={64}
          className="object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
        />
      </div>

      {/* Centered logo below card for mobile only */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 block md:hidden">
        <Image
          src="/Images/Generous_Logo.png"
          alt="Generous Logo"
          width={180}
          height={58}
          className="object-contain opacity-70"
        />
      </div>
    </div>
  );
}
