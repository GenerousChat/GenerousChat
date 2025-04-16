import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateRoomForm from "@/components/chat/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define an interface for the room data including the message count
interface RoomWithCount {
  id: string;
  created_at: string;
  name: string | null;
  description: string | null;
  user_id: string;
  messages: [{ count: number }]; // Supabase returns count in an array
}

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch chat rooms AND their message counts in one query
  const { data: roomsData, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      messages ( count )
    `)
    .order("created_at", { ascending: false });

  // Cast the data to our interface
  const rooms: RoomWithCount[] | null = roomsData as any;

  if (error) {
    console.error("Error fetching chat rooms:", error);
    // Optionally handle the error state in the UI
  }

  return (
    <div className="flex flex-col gap-8 pb-12 pt-8 max-w-4xl mx-auto px-4 md:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Spaces</h2>
            <p className="text-muted-foreground mt-1">
              Collaborative environments for chat and co-creation.
            </p>
          </div>
          <CreateRoomForm userId={user.id} trigger={ <Button> <Plus className="mr-2 h-4 w-4" /> Create Space </Button> } />
        </div>
      </div>

      <div className="space-y-4">
        {rooms && rooms.length > 0 ? (
          rooms.map((room) => (
            <Link href={`/chat/${room.id}`} key={room.id} className="block group">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate flex-1 mr-4">{room.name || 'Untitled Room'}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center justify-between pt-1">
                    <span className="truncate flex-1 mr-4">
                      {room.description || 'No description provided.'}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {room.messages[0]?.count ?? 0} {room.messages[0]?.count === 1 ? 'message' : 'messages'}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-12 text-center mt-8">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mt-3">No Spaces Yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                Create your first space to start collaborating.
              </p>
              <CreateRoomForm userId={user.id} trigger={ <Button> <Plus className="mr-2 h-4 w-4" /> Create Space </Button> } />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}