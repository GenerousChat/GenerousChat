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
  title: "Canvas",
  description: "Build applications visually with a collaborative development canvas and AI assistance.",
  openGraph: {
    title: "Canvas | Generous",
    description: "Build applications visually with a collaborative development canvas and AI assistance.",
    type: "website",
    siteName: "Generous",
    images: ["/OG.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Canvas | Generous",
    description: "Build applications visually with a collaborative development canvas and AI assistance.",
    images: ["/OG.png"],
  },
  keywords: ["visual development", "canvas", "collaborative", "application builder", "AI assistance", "real-time collaboration"]
};

export default function CanvasLayout({
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