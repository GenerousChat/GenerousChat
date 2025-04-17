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
import { Plus, Loader2 } from "lucide-react";

interface CreateRoomFormProps {
  userId: string;
  trigger?: React.ReactNode;
}

export default function CreateRoomForm({ userId, trigger }: CreateRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .insert([{ name, description, created_by: userId }])
        .select('id')
        .single();

      if (roomError) {
        console.error("Error creating chat room:", roomError);
        setIsLoading(false);
        return;
      }

      if (!roomData) {
         console.error("No data returned after creating room.");
         setIsLoading(false);
         return;
      }
      
      const roomId = roomData.id;
      console.log("Created room with ID:", roomId);

      const { error: participantError } = await supabase
        .from("room_participants")
        .insert([{ room_id: roomId, user_id: userId }]);

      if (participantError) {
        console.error("Error adding participant:", participantError);
      } else {
        console.log("Added creator as participant.");
      }
        
      router.push(`/chat/${roomId}`); 
      router.refresh();
      setOpen(false);

    } catch (error) {
      console.error("Unexpected error creating chat room:", error);
    } finally {
      if (open) { 
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setName("");
        setDescription("");
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setName("");
      setDescription("");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
            <Plus size={16} />
            <span>New Room</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full h-full max-h-screen overflow-y-auto rounded-none 
                              sm:h-auto sm:w-full sm:max-w-2xl sm:max-h-[85vh] sm:rounded-lg 
                              [&>button]:hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex-grow">
              <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-xl font-semibold">Create a new space</DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    Give your space a name and an optional description.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Project Alpha Team"
                    required
                    className="h-9 rounded-md"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description{' '}
                    <span className="text-xs text-muted-foreground/80 font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this space for?"
                    rows={3}
                    className="rounded-md min-h-[80px] resize-none px-3 py-2 text-sm 
                               focus-visible:outline-none focus-visible:ring-2 
                               focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2 flex-row justify-end">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="rounded-md h-9 
                           dark:bg-white dark:text-gray-900 dark:border-gray-300 
                           dark:hover:bg-gray-100 dark:hover:text-gray-900"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isLoading || !name.trim()}
                className="rounded-md h-9 w-[120px]"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} className="mr-1.5" /> 
                    Create Space 
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
