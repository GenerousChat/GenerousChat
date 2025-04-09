"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import { createClient } from "@/utils/supabase/client";
import ParticipantList from "@/components/chat/participant-list";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import Pusher from 'pusher-js';
import { TTSManager } from "@/components/chat/tts-manager";
import { DyteProvider, useDyteClient } from '@dytesdk/react-web-core';
import AudioRoom from '@/components/audio/audio-room';
import { createOrJoinMeeting } from '@/utils/dyte/create-meeting';

type StatusType = 'join' | 'leave';

type StatusMessage = {
  type: 'status';
  statusType: StatusType;
  userId: string;
  timestamp: string;
};

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    email: string;
  };
  name?: string;
  profile?: {
    name: string;
  };
  type: 'chat';
};

type Message = ChatMessage | StatusMessage;

type Participant = {
  user_id: string;
  joined_at: string;
  users: {
    email: string;
  };
};

// Optimized input component that handles its own state
const OptimizedInput = memo(({ onSubmit, isLoading }: {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}) => {
  // Use useRef instead of useState to avoid re-renders during typing
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localMessage, setLocalMessage] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Reset local loading state when parent loading state changes
  useEffect(() => {
    if (!isLoading && localLoading) {
      setLocalLoading(false);
    }
  }, [isLoading, localLoading]);
  
  // Handle submit with optimistic UI updates
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localMessage.trim() || localLoading) return;
    
    // Provide immediate visual feedback
    setLocalLoading(true);
    
    // Add ripple effect to button
    if (buttonRef.current) {
      const button = buttonRef.current;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      
      ripple.className = 'absolute inset-0 bg-white/20 rounded-md animate-ripple';
      button.appendChild(ripple);
      
      // Remove ripple after animation
      setTimeout(() => {
        if (ripple.parentNode === button) {
          button.removeChild(ripple);
        }
      }, 600);
    }
    
    // Capture the message before clearing it
    const messageToSend = localMessage;
    
    // Clear input immediately for better UX
    setLocalMessage("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Send the message
    onSubmit(messageToSend);
  };
  
  // Handle key press without re-rendering parent
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      className="border-t p-4 flex gap-2 items-end"
    >
      <Textarea
        ref={inputRef}
        value={localMessage}
        onChange={(e) => setLocalMessage(e.target.value)}
        placeholder="Type your message..."
        className="min-h-[60px] resize-none"
        onKeyDown={handleKeyDown}
      />
      <Button 
        ref={buttonRef}
        type="submit" 
        disabled={localLoading || !localMessage.trim()}
        className="relative overflow-hidden transition-all duration-200 active:scale-95"
      >
        {localLoading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
});

export default function ChatRoom({
  roomId,
  initialMessages,
  currentUser,
  participants: initialParticipants,
}: {
  roomId: string;
  initialMessages: Message[];
  currentUser: User;
  participants: Participant[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  // Removed newMessage state as it's now handled by the OptimizedInput component
  const [isLoading, setIsLoading] = useState(false);
  const [meeting, initMeeting] = useDyteClient();

  // Initialize Dyte meeting
  useEffect(() => {
    const initDyte = async () => {
      try {
        console.log('Initializing Dyte meeting for room:', roomId);
        
        const authToken = await createOrJoinMeeting(
          roomId,
          currentUser.id,
          currentUser.email || 'Anonymous'
        );
        
        console.log('Got Dyte auth token, initializing client...');
        
        await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: false,
          },
        });
        
        console.log('Dyte client initialized successfully');
        
        // Add event listeners to track meeting state
        meeting.self.on('roomJoined', () => {
          console.log('ChatRoom: Room joined successfully');
          console.log('Meeting state:', {
            roomJoined: meeting.self.roomJoined,
            audioEnabled: meeting.self.audioEnabled,
            meetingStarted: meeting.meta.meetingStarted,
            participantCount: Object.keys(meeting.participants.active).length
          });
        });
        
        // Track participant changes
        meeting.participants.on('participantJoined', (participant) => {
          console.log('ChatRoom: Participant joined:', {
            name: participant.name,
            id: participant.id,
            audioEnabled: participant.audioEnabled
          });
        });
      } catch (error) {
        console.error('Failed to initialize Dyte:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      }
    };

    initDyte();
  }, [roomId, currentUser]);
  const [userCache, setUserCache] = useState<Record<string, { name: string, email?: string, isAgent: boolean }>>({});
  const [newMessageReceived, setNewMessageReceived] = useState<Message | null>(null);
  const [latestHtmlContent, setLatestHtmlContent] = useState<string | null>(null);
  const [generations, setGenerations] = useState<any[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  // Fetch generations for the room
  const fetchGenerations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_room_generations')
        .select('*')
        .eq('room_id', roomId)
        .eq('type', 'visualization')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching generations:', error);
        return;
      }

      setGenerations(data || []);
      
      // If there are generations and none is selected, select the latest one
      if (data?.length > 0 && !selectedGenerationId) {
        setSelectedGenerationId(data[0].id);
        setLatestHtmlContent(data[0].html);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  }, [roomId, selectedGenerationId]);

  // Load generations when room loads
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);
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
    // Initialize Pusher without excessive logging
    Pusher.logToConsole = false;
    
    const pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3',
    });

    // Subscribe to the room channel
    const channel = pusher.subscribe(`room-${roomId}`);
    
    // Simplified connection logging
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
        const newMessage: ChatMessage = {
          ...messageData,
          type: 'chat',
          users: { email: userInfo.email || '' },
          name: userInfo.name
        };
        
        setMessages(prev => [...prev, newMessage]);
        setNewMessageReceived(newMessage);
        scrollToBottom();
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Listen for new generation notifications
    channel.bind('new-generation', async (data: any) => {
      try {
        const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (notificationData.type !== 'visualization') {
          return; // Only handle visualization type generations
        }
        
        // Fetch the generation from the database
        const { data: generation, error } = await supabase
          .from('chat_room_generations')
          .select('*')
          .eq('id', notificationData.generation_id)
          .single();

        if (error) {
          throw new Error(`Error fetching generation: ${error.message}`);
        }
        
        if (generation?.html) {
          // Add the new generation to the list and select it
          setGenerations(prev => [generation, ...prev].slice(0, 20));
          setSelectedGenerationId(generation.id);
          setLatestHtmlContent(generation.html);
        } else {
          console.warn('Generation found but no html field:', generation);
        }
      } catch (error) {
        console.error('Error handling new generation notification:', error);
      }
    });
    
    // Also keep the old event handler for backward compatibility
    channel.bind('html-visualization', (data: any) => {
      try {
        const visualizationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Update the visualization panel with the HTML content
        if (visualizationData.html) {
          setLatestHtmlContent(visualizationData.html);
        } else {
          console.warn('HTML visualization received but no html field found:', visualizationData);
        }
      } catch (error) {
        console.error("Error processing HTML visualization:", error);
      }
    });
    
    // Removed verbose state change logging

    // Listen for user joined events
    channel.bind('user-joined', async (data: { user_id: string }) => {
      // Add to participants list
      const newParticipant = {
        user_id: data.user_id,
        joined_at: new Date().toISOString(),
        users: { email: '' } // Will be populated by ParticipantList component
      };
      setParticipants(prev => [...prev, newParticipant]);
      
      // Add status message
      const statusMsg: StatusMessage = {
        type: 'status',
        statusType: 'join',
        userId: data.user_id,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, statusMsg]);
    });

    // Listen for user left events
    channel.bind('user-left', (data: { user_id: string }) => {
      // Remove from participants list
      setParticipants(prev => prev.filter(p => p.user_id !== data.user_id));
      
      // Add status message
      const statusMsg: StatusMessage = {
        type: 'status',
        statusType: 'leave',
        userId: data.user_id,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, statusMsg]);
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

  // Optimized to handle message sending without state updates during typing
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("messages").insert({
        room_id: roomId,
        user_id: currentUser.id,
        content: message,
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }
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

  // Get message timestamp based on message type
  const getMessageTimestamp = (message: Message): string => {
    if (message.type === 'chat') {
      return message.created_at;
    }
    return message.timestamp;
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

  // Default HTML content for visualization
  const defaultHtmlContent = `
  <style>
    body {
      background-color: #f9fafb;
      font-family: Arial, sans-serif;
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
  <body>
    <div class="container">
      <h2>Chat Visualization</h2>
      <p class="pulse">As your conversation evolves, AI will occasionally generate visual summaries that will appear here.</p>
    </div>
  </body>
  </html>
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
  
  return (
    <div className="flex h-full gap-4">
      {meeting && (
        <DyteProvider
          value={meeting}
        >
          <AudioRoom
            roomId={roomId}
            userId={currentUser.id}
            userName={currentUser.email || 'Anonymous'}
          />
        </DyteProvider>
      )}
      {/* Participants Panel (Left Side) */}
      <ParticipantList participants={participants} />

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
                key={message.type === 'chat' ? message.id : message.timestamp}
                className={`flex ${message.type === 'status' ? 'justify-center' : 
                  isCurrentUser(message.user_id) ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={message.type === 'status' ? 'text-xs text-gray-500 py-2' : `max-w-[80%] rounded-lg p-3 ${isCurrentUser(message.user_id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {message.type === 'status' ? (
                    <div>
                      {userCache[message.userId]?.name || 'Someone'} has {message.statusType === 'join' ? 'joined' : 'left'} the chat
                    </div>
                  ) : (
                    <>
                      {!isCurrentUser(message.user_id) && (
                        <div className="font-medium text-xs mb-1">
                          {message.name || message.profile?.name || userCache[message.user_id]?.name || getUserEmail(message.user_id)}
                        </div>
                      )}
                      <div className="break-words">{message.content}</div>
                      <div className={`text-xs mt-1 ${isCurrentUser(message.user_id) ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTime(getMessageTimestamp(message))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {generations.length > 0 && (
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => {
                  setSelectedGenerationId(gen.id);
                  setLatestHtmlContent(gen.html);
                }}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  selectedGenerationId === gen.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {new Date(gen.created_at).toLocaleTimeString()}
              </button>
            ))}
          </div>
        </div>
      )}

      <OptimizedInput 
        onSubmit={handleSendMessage}
        isLoading={isLoading} 
      />
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
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
            allow="camera; microphone; geolocation; fullscreen"
            title="Conversation Visualization"
          />
        </div>
      </div>
    </div>
  </div>
  );
}
