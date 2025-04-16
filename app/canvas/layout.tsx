import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas",
  description: "Build applications visually with a collaborative development canvas and AI assistance.",
  openGraph: {
    title: "Canvas | Generous",
    description: "Build applications visually with a collaborative development canvas and AI assistance.",
    type: "website",
    siteName: "Generous",
    images: ["/Favicons/android-chrome-512x512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Canvas | Generous",
    description: "Build applications visually with a collaborative development canvas and AI assistance.",
    images: ["/Favicons/android-chrome-512x512.png"],
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