import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Canvas from "@/components/canvas";
import { CanvasMessage } from "@/components/canvas/canvas-utils";

export default async function CanvasPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Initialize with empty messages array and optional roomId
  const messages: CanvasMessage[] = [];
  const roomId = process.env.DEFAULT_ROOM_ID || undefined;

  return (
    <div className="h-[calc(100vh-64px)] w-full p-0 m-0">
      <Canvas 
        currentUser={user}
        messages={messages}
        roomId={roomId}
      />
    </div>
  );
}