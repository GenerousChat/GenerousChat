import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/chat/chat-room";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ChatRoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch room details
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("id", params.roomId)
    .single();

  if (roomError || !room) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Chat room not found</h1>
        <p className="text-muted-foreground">
          The chat room you're looking for doesn't exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/chat">Back to Chat Rooms</Link>
        </Button>
      </div>
    );
  }

  // Check if user is a participant, if not, add them
  const { data: participant } = await supabase
    .from("room_participants")
    .select("*")
    .eq("room_id", params.roomId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    await supabase.from("room_participants").insert({
      room_id: params.roomId,
      user_id: user.id,
    });
  }

  // Fetch messages
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      created_at,
      user_id,
      auth.users (email)
    `)
    .eq("room_id", params.roomId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
  }

  // Fetch participants
  const { data: participants, error: participantsError } = await supabase
    .from("room_participants")
    .select(`
      user_id,
      joined_at,
      auth.users (email)
    `)
    .eq("room_id", params.roomId);

  if (participantsError) {
    console.error("Error fetching participants:", participantsError);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-2">
            <Link href="/chat">← Back to Rooms</Link>
          </Button>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {room.description && (
            <p className="text-muted-foreground">{room.description}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {participants?.length || 0} participant(s)
        </div>
      </div>

      <ChatRoom
        roomId={params.roomId}
        initialMessages={messages || []}
        currentUser={user}
        participants={participants || []}
      />
    </div>
  );
}
