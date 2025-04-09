import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateRoomForm from "@/components/chat/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Users } from "lucide-react";
import { BlurFade } from "@/components/ui/magicui/blur-fade";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { ShinyButton } from "@/components/ui/magicui/shiny-button";

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
    <div className="flex flex-col gap-10 pb-12 pt-8">
      <div className="flex justify-between items-center">
        <BlurFade delay={0.2}>
          <h2 className="text-xl font-semibold">Spaces</h2>
        </BlurFade>
        
        <BlurFade delay={0.3}>
          <CreateRoomForm userId={user.id} />
        </BlurFade>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms && rooms.length > 0 ? (
          rooms.map((room, index) => (
            <BlurFade key={room.id} delay={0.2 + (index * 0.1)} className="h-full">
              <div className="w-full h-full [perspective:1000px]">
                <CardContainer className="w-full h-full [transform-style:preserve-3d]">
                  <div className="w-full h-full rounded-xl p-[1px] [transform-style:preserve-3d] relative overflow-hidden shadow-md dark:shadow-primary/5 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/5 dark:from-primary/30 dark:via-primary/20 dark:to-primary/10">
                    <Card className="w-full h-full border-0 bg-background dark:bg-background/95 rounded-xl [transform-style:preserve-3d] hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-2 [transform-style:preserve-3d]">
                        <CardItem translateZ={25} className="w-full [transform-style:preserve-3d]">
                          <CardTitle className="text-xl">{room.name}</CardTitle>
                        </CardItem>
                        <CardItem translateZ={15} className="w-full [transform-style:preserve-3d]">
                          <CardDescription className="line-clamp-2 mt-1">
                            {room.description || "No description provided"}
                          </CardDescription>
                        </CardItem>
                      </CardHeader>
                      <CardContent className="[transform-style:preserve-3d]">
                        <div className="flex justify-between items-center pt-3 [transform-style:preserve-3d]">
                          <CardItem translateZ={10} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users size={14} />
                            <span>Active</span>
                          </CardItem>
                          <CardItem translateZ={35} className="[transform-style:preserve-3d]">
                            <Link href={`/chat/${room.id}`} className="block [transform-style:preserve-3d]">
                              <ShinyButton className="px-4 py-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white dark:text-primary-foreground rounded-lg shadow-md dark:shadow-primary/20 transition-all duration-300 hover:scale-105">
                                Join Chat
                              </ShinyButton>
                            </Link>
                          </CardItem>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContainer>
              </div>
            </BlurFade>
          ))
        ) : (
          <BlurFade delay={0.3} className="col-span-full bg-muted/10 dark:bg-muted/5 rounded-xl border border-primary/10 dark:border-primary/20 p-12 text-center shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shadow-inner">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mt-4">No chat rooms yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Create your first chat room to start collaborating with others in real-time
              </p>
              <div className="scale-110">
                <CreateRoomForm userId={user.id} />
              </div>
            </div>
          </BlurFade>
        )}
      </div>
    </div>
  );
}