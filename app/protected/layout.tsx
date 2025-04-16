import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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
  title: "Protected Area",
  description: "Secure area for authenticated users of Generous.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Protected Area | Generous",
    description: "Secure area for authenticated users of Generous.",
    type: "website",
    siteName: "Generous",
    images: ["/OG.png"],
  },
  twitter: {
    card: "summary",
    title: "Protected Area | Generous",
    description: "Secure area for authenticated users of Generous.",
    images: ["/OG.png"],
  }
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return <>{children}</>;
}
