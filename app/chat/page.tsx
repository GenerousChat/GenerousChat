import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateRoomForm from "@/components/chat/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimeAgoDisplay from '@/components/ui/time-ago-display';
import RoomThumbnail from '@/components/chat/room-thumbnail';

// Define an interface for the room data including the message count and generations
interface RoomWithCount {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  description: string | null;
  messages: [{ count: number }];
  canvas_generations: { id: string; created_at: string }[];
}

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch chat rooms AND their message counts and latest generation ID
  console.log("Fetching rooms for user:", user.id); // Add log
  const { data: roomsData, error, status } = await supabase
    .from("chat_rooms")
    .select(`
      id, 
      created_at, 
      updated_at, 
      name, 
      description, 
      messages ( count ),
      canvas_generations!left ( id, created_at )
    `)
    .order("updated_at", { ascending: false });

  // Add more detailed logging
  console.log("Supabase query status:", status);
  if (error) {
    console.error("Error fetching chat rooms:", JSON.stringify(error, null, 2));
  } else {
    console.log("Fetched roomsData:", JSON.stringify(roomsData, null, 2));
  }

  // Cast the data to our interface
  const rooms: RoomWithCount[] | null = roomsData;

  // Log the final rooms array before rendering
  console.log("Rooms to render:", rooms?.length);

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
          rooms.map((room) => {
            // Find the latest generation ID using the original property name
            const latestGeneration = room.canvas_generations
              ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              ?.[0];
            const generationId = latestGeneration?.id;

            // Construct the thumbnail URL using the generation ID or fallback
            let thumbnailUrl = null;
            if (generationId) {
              const cacheBuster = new Date(room.updated_at).getTime(); // Use room's updated_at for cache busting
              thumbnailUrl = `https://screenshot-peach-beta.vercel.app/api?v=1&url=https://generous.rocks/api/generation/${generationId}&cacheBust=${cacheBuster}`;
            }

            return (
              <Link href={`/chat/${room.id}`} key={room.id} className="block group">
                <Card className="hover:bg-muted/50 transition-colors">
                  {/* Use Flexbox for layout: Image | Text Content */}
                  <CardHeader className="flex flex-row items-start p-4"> {/* Adjust padding/items as needed */}
                    {/* Use the RoomThumbnail client component, pass larger size */}
                    <RoomThumbnail
                      src={thumbnailUrl || '/placeholder.png'} // Provide a fallback image source or handle null in component
                      alt={`${room.name || 'Room'} thumbnail`}
                      className="w-24 h-24 rounded-md mr-4 object-cover flex-shrink-0" // <-- Increased size
                    />
                    <div className="flex-grow min-w-0"> {/* Ensure text div can shrink/grow */}
                      <CardTitle className="flex items-center justify-between text-base mb-1"> {/* Adjusted text size/margin */}
                        <span className="truncate flex-1 mr-2">{room.name || 'Untitled Room'}</span> {/* Adjusted margin */}
                        <TimeAgoDisplay date={room.updated_at} className="text-xs text-muted-foreground font-normal whitespace-nowrap" />
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between text-sm"> {/* Adjusted text size */}
                        <span className="truncate flex-1 mr-2"> {/* Adjusted margin */}
                          {room.description || 'No description.'} {/* Shortened default */} 
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap"> {/* Adjusted text size */}
                          <MessageSquare className="h-3 w-3 mr-1" /> {/* Adjusted icon size */}
                          {room.messages[0]?.count ?? 0} {room.messages[0]?.count === 1 ? 'msg' : 'msgs'} {/* Shortened text */}
                        </span>
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })
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