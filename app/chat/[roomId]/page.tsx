import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/chat/chat-room";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ChatRoomPage(props: any) {
  const roomId = props.params.roomId;
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
    .eq("id", roomId)
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
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    await supabase.from("room_participants").insert({
      room_id: roomId,
      user_id: user.id,
    });
  }

  // Fetch messages
  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      created_at,
      user_id,
      auth.users (email)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
    
  // Transform messages to match the expected type
  const messages = messagesData ? messagesData.map((msg: any) => ({
    id: msg.id,
    content: msg.content,
    created_at: msg.created_at,
    user_id: msg.user_id,
    users: msg.users || { email: "Unknown" }
  })) : [];

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
  }

  // Fetch participants
  const { data: participantsData, error: participantsError } = await supabase
    .from("room_participants")
    .select(`
      user_id,
      joined_at,
      auth.users (email)
    `)
    .eq("room_id", roomId);
    
  // Transform participants to match the expected type
  const participants = participantsData ? participantsData.map((participant: any) => ({
    user_id: participant.user_id,
    joined_at: participant.joined_at,
    users: participant.users || { email: "Unknown" }
  })) : [];

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
        roomId={roomId}
        initialMessages={messages}
        currentUser={user}
        participants={participants}
      />
    </div>
  );
}
