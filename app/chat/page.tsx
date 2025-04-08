import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateRoomForm from "@/components/chat/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch chat rooms
  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching chat rooms:", error);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chat Rooms</h1>
        <CreateRoomForm userId={user.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms && rooms.length > 0 ? (
          rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle>{room.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {room.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Created: {new Date(room.created_at).toLocaleDateString()}
                  </span>
                  <Button asChild size="sm">
                    <Link href={`/chat/${room.id}`}>Join Chat</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <h3 className="text-xl font-medium mb-2">No chat rooms yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first chat room to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
