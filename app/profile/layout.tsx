import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Generous profile, settings, and preferences.",
  openGraph: {
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    type: "profile",
    siteName: "Generous",
    images: ["/Favicons/android-chrome-512x512.png"],
  },
  twitter: {
    card: "summary",
    title: "Profile | Generous",
    description: "Manage your Generous profile, settings, and preferences.",
    images: ["/Favicons/android-chrome-512x512.png"],
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