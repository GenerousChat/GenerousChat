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
  title: "Chat",
  description: "Collaborate with your team through real-time chat and AI assistance.",
  openGraph: {
    title: "Chat | Generous",
    description: "Collaborate with your team through real-time chat and AI assistance.",
    type: "website",
    siteName: "Generous",
    images: [{
      url: `${defaultUrl}/Og_images/OG.png`,
      width: 1200,
      height: 630,
      alt: "Chat | Generous",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chat | Generous",
    description: "Collaborate with your team through real-time chat and AI assistance.",
    images: [`${defaultUrl}/Og_images/OG.png`],
  },
  keywords: ["team chat", "collaboration", "real-time communication", "AI assistance", "team messaging"]
};

export default function ChatLayout({
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
