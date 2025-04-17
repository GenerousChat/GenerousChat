import { Metadata } from "next";
import { Viewport } from "next";
import Image from "next/image";
import { headers } from 'next/headers';

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
  const headersList = await headers();
  const pathname = headersList.get('next-url') || '';
  
  console.log('>>> Auth Layout Detected Pathname:', pathname);
  
  let imageSrc = "/Images/Walking.png";
  let objectPosition = "object-center";

  if (pathname === '/sign-up') {
    imageSrc = "/Images/Hands.png";
  } else if (pathname === '/forgot-password') {
    imageSrc = "/Images/Robohand.png";
    objectPosition = "object-[center_35%]";
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-start md:justify-center gap-6 px-4 py-8 md:py-8 overflow-hidden">
      {/* Background image - conditional based on path */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt="Background"
          fill
          priority
          className={`object-cover ${objectPosition}`}
          sizes="100vw"
          quality={100}
        />
      </div>
      
      {/* Centered logo above card for DESKTOP screen sizes */}
      <div className="z-10 hidden md:block">
        <Image
          src="/logo.svg"
          alt="Generous Logo"
          width={180} 
          height={58}
          className="object-contain md:w-[400px] md:h-auto dark:invert dark:brightness-200"
        />
      </div>

      {/* Card container */}
      <div className="w-full max-w-[450px] relative z-10">
        {/* Removed min-h-[550px] to allow natural height */}
        <div className="w-full bg-background rounded-2xl shadow-xl p-6 sm:p-10 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
