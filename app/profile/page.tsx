"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(""); // Clear any previous errors
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        console.log("Loading profile for user:", user.id);
        
        // Fetch user's profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (error) {
          // Check if it's a "not found" error, which is expected if the profile doesn't exist yet
          if (error.code === 'PGRST116') {
            console.log("Profile not found, creating a new one");
            
            // Generate a random name
            const adjectives = ['Happy', 'Sleepy', 'Grumpy', 'Sneezy', 'Dopey', 'Bashful', 'Doc', 'Jumpy', 'Silly', 'Witty'];
            const nouns = ['Panda', 'Tiger', 'Elephant', 'Giraffe', 'Penguin', 'Koala', 'Dolphin', 'Hedgehog', 'Raccoon', 'Sloth'];
            const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
            const randomName = randomAdjective + randomNoun;
            
            console.log("RLS might prevent direct profile creation. Using a temporary profile.");
            
            // Instead of trying to create a profile directly (which might fail due to RLS),
            // just create a temporary profile object for the UI
            const tempProfile = {
              id: user.id,
              name: randomName,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setProfile(tempProfile);
            setName(tempProfile.name);
            
            // Show a message to the user
            setSuccess("Welcome! We've generated a random name for you. You can change it below.");
          } else {
            console.error("Error loading profile:", error);
            setError("Failed to load profile: " + error.message);
          }
        } else if (data) {
          console.log("Loaded existing profile:", data);
          setProfile(data);
          setName(data.name);
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
        setError("An unexpected error occurred. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [router, supabase]);
  
  const handleUpdateProfile = async () => {
    if (!profile || !name.trim()) return;
    
    setUpdating(true);
    setError(""); // Clear previous errors
    console.log("Updating profile with name:", name);
    
    try {
      // First try to check if the profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", profile.id)
        .maybeSingle();
      
      let operation;
      if (!existingProfile || checkError) {
        console.log("Profile doesn't exist, attempting to insert");
        // If profile doesn't exist, try to insert
        operation = supabase
          .from("profiles")
          .insert({
            id: profile.id,
            name: name,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
      } else {
        console.log("Profile exists, attempting to update");
        // If profile exists, update it
        operation = supabase
          .from("profiles")
          .update({ name, updated_at: new Date().toISOString() })
          .eq("id", profile.id)
          .select()
          .single();
      }
      
      // Execute the operation
      const { data, error } = await operation;
    
      if (error) {
        console.error("Error updating profile:", error);
        setError("Failed to update profile. Please try again: " + error.message);
      } else if (data) {
        console.log("Profile updated successfully:", data);
        setProfile(data);
        setSuccess("Your profile has been updated.");
        
        // Update local storage cache for chat
        try {
          const chatUserCache = localStorage.getItem('chatUserCache');
          if (chatUserCache) {
            const cache = JSON.parse(chatUserCache);
            if (cache[profile.id]) {
              cache[profile.id].name = name;
              localStorage.setItem('chatUserCache', JSON.stringify(cache));
            }
          }
        } catch (err) {
          console.error("Error updating local cache:", err);
        }
      } else {
        setError("No data returned from update operation. Please try again.");
      }
    } catch (err) {
      console.error("Unexpected error during profile update:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };
  
  const handleGenerateRandomName = async () => {
    setLoading(true);
    setError(""); // Clear previous errors
    
    try {
      console.log("Calling generate_random_name RPC");
      const { data, error } = await supabase.rpc('generate_random_name');
      
      if (error) {
        console.error("Error generating name:", error);
        setError("Failed to generate a random name: " + error.message);
      } else if (data) {
        console.log("Generated random name:", data);
        setName(data);
      } else {
        // If the RPC doesn't work, generate a name client-side as fallback
        const adjectives = ['Happy', 'Sleepy', 'Grumpy', 'Sneezy', 'Dopey', 'Bashful', 'Doc', 'Jumpy', 'Silly', 'Witty'];
        const nouns = ['Panda', 'Tiger', 'Elephant', 'Giraffe', 'Penguin', 'Koala', 'Dolphin', 'Hedgehog', 'Raccoon', 'Sloth'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomName = randomAdjective + randomNoun;
        console.log("Generated fallback name:", randomName);
        setName(randomName);
      }
    } catch (err) {
      console.error("Unexpected error generating name:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Update your profile information that will be visible to others in chat rooms.
          </CardDescription>
          {error && (
            <div className="mt-2 text-sm font-medium text-destructive">{error}</div>
          )}
          {success && (
            <div className="mt-2 text-sm font-medium text-green-600">{success}</div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
              <Button 
                variant="outline" 
                onClick={handleGenerateRandomName}
                disabled={loading}
              >
                Random
              </Button>
            </div>
          </div>
          
          {/* Could add avatar upload functionality here in the future */}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProfile} 
            disabled={updating || !name.trim() || name === profile?.name}
            type="button"
          >
            {updating ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
