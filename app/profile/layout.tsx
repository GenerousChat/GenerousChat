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

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Generous profile, settings, and preferences.",
  openGraph: {
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    type: "profile",
    siteName: "Generous",
    images: ["/OG.png"],
  },
  twitter: {
    card: "summary",
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    images: ["/OG.png"],
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