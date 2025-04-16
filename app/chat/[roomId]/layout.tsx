import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import React from "react";

// In Next.js 15, params is passed as a Promise
export async function generateMetadata({ 
  params,
}: { 
  params: Promise<{ roomId: string }>
}): Promise<Metadata> {
  const { roomId } = await params;
  
  // You can fetch room name if you have a database table for it
  // This is a placeholder for demonstration
  // Replace with actual data fetching logic
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("name, description, created_at")
    .eq("id", roomId)
    .single();
  
  const roomName = room?.name || `Chat Room ${roomId}`;
  const roomDescription = room?.description || `Collaborate in the ${roomName} chat room with your team and AI assistance.`;
  
  return {
    title: roomName,
    description: roomDescription,
    openGraph: {
      title: `${roomName} | Generous`,
      description: roomDescription,
      type: "website",
      siteName: "Generous",
      images: ["/Favicons/android-chrome-512x512.png"],
      url: `/chat/${roomId}`,
    },
    twitter: {
      card: "summary",
      title: `${roomName} | Generous`,
      description: roomDescription,
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