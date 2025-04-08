"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    email: string;
  };
};

type Participant = {
  user_id: string;
  joined_at: string;
  users: {
    email: string;
  };
};

export default function ChatRoom({
  roomId,
  initialMessages,
  currentUser,
  participants,
}: {
  roomId: string;
  initialMessages: Message[];
  currentUser: User;
  participants: Participant[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time subscription to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the user information for the new message
          const { data } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              created_at,
              user_id,
              auth.users (email)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("messages").insert({
        room_id: roomId,
        user_id: currentUser.id,
        content: newMessage,
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user email by user ID
  const getUserEmail = (userId: string) => {
    const participant = participants.find((p) => p.user_id === userId);
    return participant?.users.email || "Unknown User";
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if message is from current user
  const isCurrentUser = (userId: string) => userId === currentUser.id;

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Be the first to send a message!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  isCurrentUser(message.user_id) ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isCurrentUser(message.user_id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {!isCurrentUser(message.user_id) && (
                    <div className="font-medium text-xs mb-1">
                      {message.users?.email || getUserEmail(message.user_id)}
                    </div>
                  )}
                  <div className="break-words">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isCurrentUser(message.user_id)
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSendMessage}
        className="border-t p-4 flex gap-2 items-end"
      >
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <Button type="submit" disabled={isLoading || !newMessage.trim()}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
