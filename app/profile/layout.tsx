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
  title: "Profile",
  description: "Manage your Generous profile, settings, and preferences.",
  openGraph: {
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    type: "profile",
    siteName: "Generous",
    images: [{
      url: `${defaultUrl}/Og_images/OG.png`,
      width: 1200,
      height: 630,
      alt: "Profile | Generous",
    }],
  },
  twitter: {
    card: "summary",
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    images: [`${defaultUrl}/Og_images/OG.png`],
  },
  robots: {
    index: false,
    follow: true,
  }
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full">
      {children}
    </div>
  );
} 