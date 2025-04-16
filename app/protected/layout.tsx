import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";

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
    images: ["/Favicons/android-chrome-512x512.png"],
  },
  twitter: {
    card: "summary",
    title: "Protected Area | Generous",
    description: "Secure area for authenticated users of Generous.",
    images: ["/Favicons/android-chrome-512x512.png"],
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
