import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description: "Collaborate with your team through real-time chat and AI assistance.",
  openGraph: {
    title: "Chat | Generous",
    description: "Collaborate with your team through real-time chat and AI assistance.",
    type: "website",
    siteName: "Generous",
    images: ["/Favicons/android-chrome-512x512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chat | Generous",
    description: "Collaborate with your team through real-time chat and AI assistance.",
    images: ["/Favicons/android-chrome-512x512.png"],
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
