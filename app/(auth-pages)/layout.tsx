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
  
  // Always use Robohand.png for auth pages
  const imageSrc = "/Images/Robohand.png";
  const objectPosition = "object-[center_35%]";

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-4 py-8 md:py-12">
      {/* Header with logo */}
      <div className="w-full max-w-[450px] mb-8 text-center">
        <Image
          src="/logo.svg"
          alt="Generous Logo"
          width={180} 
          height={58}
          className="mx-auto dark:invert"
        />
      </div>

      {/* Card container */}
      <div className="w-full max-w-[450px] relative">
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          {children}
        </div>
      </div>
      
      {/* Decorative image */}
      <div className="fixed bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 -z-10 opacity-20 dark:opacity-10 pointer-events-none">
        <Image
          src={imageSrc}
          alt="Decorative Background"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 256px, 384px"
        />
      </div>
    </div>
  );
}
