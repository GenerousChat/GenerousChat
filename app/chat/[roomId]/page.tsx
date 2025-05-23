import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/chat/chat-room";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Get messages table name from environment variable or use default
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'messages';

export default async function ChatRoomPage({
  params
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Check if user is a participant, if not, add them (only for logged-in users)
  if (user) {
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
  }

  // Fetch messages
  const { data: messagesData, error: messagesError } = await supabase
    .from(MESSAGES_TABLE)
    .select(`
      id,
      content,
      created_at,
      user_id
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
    
  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
  }
  
  // Create a map of user IDs to emails
  const userEmails: Record<string, string> = {};
  
  // Add current user to the map if logged in
  if (user) {
    userEmails[user.id] = user.email || 'Unknown';
  }
  
  // Transform messages to match the expected type
  const messages = messagesData ? messagesData.map((msg: any) => ({
    id: msg.id,
    content: msg.content,
    created_at: msg.created_at,
    user_id: msg.user_id,
    users: { email: userEmails[msg.user_id] || 'Unknown' },
    type: 'chat' as const,
    email: userEmails[msg.user_id] || 'Unknown'
  })) : [];

  // Fetch participants
  const { data: participantsData, error: participantsError } = await supabase
    .from("room_participants")
    .select(`
      user_id,
      joined_at
    `)
    .eq("room_id", roomId);
    
  if (participantsError) {
    console.error("Error fetching participants:", participantsError);
  }
  
  // For participants, use the same userEmails map we built earlier
  // Transform participants to match the expected type
  const participants = participantsData ? participantsData.map((participant: any) => ({
    user_id: participant.user_id,
    joined_at: participant.joined_at,
    users: { email: userEmails[participant.user_id] || 'Unknown' }
  })) : [];

  return (
    <div className="flex flex-col w-full h-[calc(100vh-120px)]">
      {!user && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-md mb-4 text-sm flex items-center justify-between">
          <span>You are viewing this chat as a guest. <Link href="/sign-in" className="font-medium underline ml-1">Sign in</Link> to participate in the conversation.</span>
        </div>
      )}
      <ChatRoom
        roomId={roomId}
        initialMessages={messages}
        currentUser={user || null}
        participants={participants}
      />
    </div>
  );
}
