"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ShinyButton } from "@/components/ui/magicui/shiny-button";
import { Plus, Loader2 } from "lucide-react";
import { BlurFade } from "@/components/ui/magicui/blur-fade";
import { BackgroundGradient } from "@/components/ui/background-gradient";

export default function CreateRoomForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("chat_rooms")
        .insert([
          {
            name,
            description,
            created_by: userId,
          },
        ])
        .select();

      if (error) {
        console.error("Error creating chat room:", error);
        return;
      }

      // Join the room as a participant
      if (data && data.length > 0) {
        const roomId = data[0].id;
        
        await supabase
          .from("room_participants")
          .insert([
            {
              room_id: roomId,
              user_id: userId,
            },
          ]);
          
        // Navigate to the new room
        router.push(`/chat/${roomId}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Error creating chat room:", error);
    } finally {
      setIsLoading(false);
      setOpen(false);
      setName("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ShinyButton 
          className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white dark:text-primary-foreground font-medium shadow-md hover:shadow-lg dark:shadow-primary/10 transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center dark:bg-black/20">
            <Plus size={16} className="text-white dark:text-primary-foreground" />
          </div>
          <span>New Room</span>
        </ShinyButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-0 overflow-hidden p-0">
        <BackgroundGradient className="p-[1px] rounded-xl overflow-hidden">
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6">
            <form onSubmit={handleSubmit}>
              <DialogHeader className="mb-4">
                <BlurFade delay={0.1}>
                  <DialogTitle className="text-2xl font-bold">Create a new space</DialogTitle>
                </BlurFade>
                <BlurFade delay={0.2}>
                  <DialogDescription className="text-muted-foreground mt-2">
                    Create a room where people can join and collaborate together.
                  </DialogDescription>
                </BlurFade>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <BlurFade delay={0.3} className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">Room Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter room name"
                    required
                    className="rounded-lg border-muted-foreground/20 focus:border-primary/60 bg-background/80 h-10"
                  />
                </BlurFade>
                <BlurFade delay={0.4} className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this chat room is about"
                    rows={3}
                    className="rounded-lg border-muted-foreground/20 focus:border-primary/60 bg-background/80 min-h-[80px] resize-none"
                  />
                </BlurFade>
              </div>
              <DialogFooter className="mt-2 gap-2 flex-row justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="bg-background border-muted-foreground/30 hover:bg-background/80"
                >
                  Cancel
                </Button>
                <ShinyButton 
                  type="submit" 
                  disabled={isLoading}
                  className={`px-5 py-3 rounded-lg flex items-center gap-2 ${
                    isLoading 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                  } text-white dark:text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 ${!isLoading && 'hover:scale-[1.02]'}`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus size={16} />
                      <span>Create Room</span>
                    </div>
                  )}
                </ShinyButton>
              </DialogFooter>
            </form>
          </div>
        </BackgroundGradient>
      </DialogContent>
    </Dialog>
  );
}
