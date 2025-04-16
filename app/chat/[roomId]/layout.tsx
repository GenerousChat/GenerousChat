import { Metadata, ResolvingMetadata } from "next";
import { createClient } from "@/utils/supabase/server";
import React from "react";
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

// In Next.js, params is passed as a Promise
export async function generateMetadata({ 
  params,
}: { 
  params: Promise<{ roomId: string }>
}): Promise<Metadata> {
  const { roomId } = await params;
  
  // Fetch room details from the correct table
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  
  // Use the room.name if available, otherwise fallback to a generic name
  const roomName = room?.name || `Chat Room ${roomId}`;
  const roomDescription = room?.description || `Collaborate in the ${roomName} chat room with your team and AI assistance.`;
  
  return {
    title: `${roomName} - Generous`,
    description: roomDescription,
    openGraph: {
      title: `${roomName} - Generous`,
      description: roomDescription,
      type: "website",
      siteName: "Generous",
      images: ["/OG.png"],
      url: `/chat/${roomId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${roomName} - Generous`,
      description: roomDescription,
      images: ["/OG.png"],
    },
  };
}

export default function ChatRoomLayout({
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