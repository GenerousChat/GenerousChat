"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import Pusher from 'pusher-js';
import { TTSManager } from "@/components/chat/tts-manager";

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    email: string;
  };
  name?: string; // Added name field
  profile?: {
    name: string;
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
  const [userCache, setUserCache] = useState<Record<string, { name: string, email?: string, isAgent: boolean }>>({});
  const [newMessageReceived, setNewMessageReceived] = useState<Message | null>(null);
  const [latestHtmlContent, setLatestHtmlContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user cache from local storage on component mount
  useEffect(() => {
    const storedUsers = localStorage.getItem('chatUserCache');
    if (storedUsers) {
      try {
        setUserCache(JSON.parse(storedUsers));
      } catch (error) {
        console.error('Error parsing user cache from localStorage:', error);
      }
    }
  }, []);

  // Set up Pusher subscription for real-time messages
  useEffect(() => {
    // Initialize Pusher with logging enabled for debugging
    Pusher.logToConsole = true; // Remove this in production
    
    const pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3',
    });

    // Subscribe to the room channel
    const channel = pusher.subscribe(`room-${roomId}`);
    
    // Log connection status
    pusher.connection.bind('connected', () => {
      console.log('Connected to Pusher!', `Subscribed to channel: room-${roomId}`);
    });
    
    pusher.connection.bind('error', (err: any) => {
      console.error('Pusher connection error:', err);
    });

    // Listen for new messages
    channel.bind('new-message', async (data: any) => {
      try {
        const messageData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Get user info and update cache if needed
        const userInfo = await getUserInfo(messageData.user_id);
        
        // Create a properly typed message object
        const newMessage: Message = {
          id: messageData.id,
          content: messageData.content,
          created_at: messageData.created_at,
          user_id: messageData.user_id,
          users: { email: userInfo.email || '' },
          name: userInfo.name
        };
        
        // No need to check for HTML content in regular messages anymore
        
        setMessages((prev) => [...prev, newMessage]);
        // Set the new message for TTS
        setNewMessageReceived(newMessage);
        scrollToBottom();
      } catch (error) {
        console.error("Error processing Pusher message:", error);
      }
    });

    // Listen for HTML visualizations
    channel.bind('html-visualization', (data: any) => {
      try {
        console.log('Received HTML visualization event:', data);
        const visualizationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Update the visualization panel with the HTML content
        if (visualizationData.html) {
          console.log('Setting latest HTML content, length:', visualizationData.html.length);
          setLatestHtmlContent(visualizationData.html);
        } else {
          console.warn('HTML visualization received but no html field found:', visualizationData);
        }
      } catch (error) {
        console.error("Error processing HTML visualization:", error);
      }
    });
    
    // Log when Pusher connection state changes
    pusher.connection.bind('state_change', (states: any) => {
      console.log('Pusher connection state changed from', states.previous, 'to', states.current);
    });

    // Listen for user joined events
    channel.bind('user-joined', (data: any) => {
      console.log('User joined the room:', data);
      // You could update the participants list here if needed
    });

    // Listen for user left events
    channel.bind('user-left', (data: any) => {
      console.log('User left the room:', data);
      // You could update the participants list here if needed
    });

    // Clean up on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

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

  // Store user info in local storage
  const storeUserInfo = (userId: string, name: string, email: string = '', isAgent: boolean = false) => {
    const updatedCache = { ...userCache, [userId]: { name, email, isAgent } };
    setUserCache(updatedCache);
    localStorage.setItem('chatUserCache', JSON.stringify(updatedCache));
  };

  // Get user info from cache, profiles, participants, or agents table
  const getUserInfo = async (userId: string): Promise<{ name: string, email?: string, isAgent: boolean }> => {
    // First check if it's in our cache
    if (userCache[userId]) {
      return { 
        name: userCache[userId].name, 
        email: userCache[userId].isAgent ? undefined : userCache[userId].name, 
        isAgent: userCache[userId].isAgent 
      };
    }

    // Check if it's the current user
    if (userId === currentUser.id) {
      const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'You';
      storeUserInfo(userId, name, currentUser.email || '', false);
      return { name, email: currentUser.email, isAgent: false };
    }

    // Try to get user from profiles table
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (profile && !error) {
        storeUserInfo(userId, profile.name, '', false);
        return { name: profile.name, isAgent: false };
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }

    // Check participants list
    const participant = participants.find((p) => p.user_id === userId);
    if (participant) {
      const name = participant.users?.email?.split('@')[0] || 'User';
      storeUserInfo(userId, name, participant.users?.email, false);
      return { name, email: participant.users?.email, isAgent: false };
    }

    // If not found, check if it's an agent
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('name')
        .eq('id', userId)
        .single();

      if (agent && !error) {
        storeUserInfo(userId, agent.name, undefined, true);
        return { name: agent.name, isAgent: true };
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
    }

    // Default fallback
    const defaultName = 'Unknown User';
    storeUserInfo(userId, defaultName, '', false);
    return { name: defaultName, isAgent: false };
  };

  // Get user email by user ID (simplified version for backward compatibility)
  const getUserEmail = (userId: string) => {
    // First check cache
    if (userCache[userId]) {
      return userCache[userId].isAgent ? userCache[userId].name : userCache[userId].email || userCache[userId].name;
    }
    
    // Then check if it's the current user
    if (userId === currentUser.id) {
      return currentUser.email || "You";
    }
    
    // Then check participants list
    const participant = participants.find((p) => p.user_id === userId);
    return participant?.users?.email || "Unknown User";
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

  // These functions are no longer needed as HTML content comes through a separate channel

  // Default HTML content for visualization
  const defaultHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #334155;
        }
        .container {
          max-width: 100%;
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        h2 {
          margin-top: 0;
          color: #3b82f6;
        }
        p {
          line-height: 1.6;
          margin-bottom: 0;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Chat Visualization</h2>
        <p class="pulse">As your conversation evolves, AI will occasionally generate visual summaries that will appear here.</p>
      </div>
    </body>
    </html>
  `;
  
  // Log when latestHtmlContent changes
  useEffect(() => {
    console.log('latestHtmlContent updated:', latestHtmlContent ? 'HTML content present' : 'No HTML content');
  }, [latestHtmlContent]);

  return (
    <div className="flex h-full">
      {/* Main Chat Column */}
      <div className="flex flex-col h-full border rounded-lg overflow-hidden relative flex-1">
        <TTSManager 
          messages={messages} 
          userCache={userCache} 
          currentUserId={currentUser.id}
          newMessageReceived={newMessageReceived}
        />
        
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
                      {message.name || message.profile?.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
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
    
    {/* Visualization Panel (Right Side) */}
    <div className="w-1/3 ml-4 border rounded-lg overflow-hidden bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Conversation Visualization</h3>
      </div>
      <div className="flex-1 p-4">
        <div className="bg-white rounded-md overflow-hidden shadow-sm h-full">
          <iframe
            srcDoc={latestHtmlContent || defaultHtmlContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Conversation Visualization"
          />
        </div>
      </div>
    </div>
  </div>
  );
}
