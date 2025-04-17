"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, RefreshCw, Save, Shield, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  // Ref to store the timer ID for the random name spin delay
  const randomNameTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setError("");
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        setUserEmail(user.email || "");
        
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
        console.log(`[Profile Load] Finished.`);
      }
    }
    
    loadProfile();

    // Cleanup function to clear random name timer on unmount
    return () => {
      if (randomNameTimerRef.current) {
        clearTimeout(randomNameTimerRef.current);
      }
    };
  }, [router, supabase]);
  
  const handleUpdateProfile = async () => {
    if (!profile || !name.trim()) return;
    
    setUpdating(true);
    setError("");
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
    const startTime = Date.now(); // Record start time
    setIsGeneratingName(true);
    setError("");
    
    try {
      console.log("Calling generate_random_name RPC");
      const { data, error } = await supabase.rpc('generate_random_name');
      
      if (error) {
        console.error("Error generating name:", error);
        setError("Failed to generate a random name: " + error.message);
      } else if (data) {
        console.log("Generated random name:", data);
        setName(data);
        setSuccess('');
        setError('');
      } else {
        // If the RPC doesn't work, generate a name client-side as fallback
        const adjectives = ['Happy', 'Sleepy', 'Grumpy', 'Sneezy', 'Dopey', 'Bashful', 'Doc', 'Jumpy', 'Silly', 'Witty'];
        const nouns = ['Panda', 'Tiger', 'Elephant', 'Giraffe', 'Penguin', 'Koala', 'Dolphin', 'Hedgehog', 'Raccoon', 'Sloth'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomName = randomAdjective + randomNoun;
        console.log("Generated fallback name:", randomName);
        setName(randomName);
        setSuccess('');
        setError('');
      }
    } catch (err) {
      console.error("Unexpected error generating name:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      const elapsedTime = Date.now() - startTime; 
      const minimumSpinTime = 1000; // 2 seconds minimum spin time
      const delay = Math.max(0, minimumSpinTime - elapsedTime); 
      console.log(`[Random Name] Generated in: ${elapsedTime}ms. Delaying spin stop by: ${delay}ms`);

      // Clear previous timer if it exists
      if (randomNameTimerRef.current) {
        clearTimeout(randomNameTimerRef.current);
      }

      // Set generating state to false after the minimum delay
      randomNameTimerRef.current = setTimeout(() => {
        setIsGeneratingName(false);
        randomNameTimerRef.current = null; // Clear ref after execution
        console.log(`[Random Name] Spin timeout finished.`);
      }, delay);

      console.log(`[Random Name] API call finished.`); // Log API finish time
    }
  };
  
  return (
    <div className="flex flex-1 items-center justify-center p-4 py-6 sm:p-6 sm:py-8 md:p-8 md:py-12">
      
      <div className={`container w-full max-w-2xl space-y-4 sm:space-y-6 md:space-y-8`}>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Manage your account settings</p>
        </div>

        <Card className="rounded-xl shadow-lg border w-full">
          <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-2 sm:pb-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Profile Details</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Update your display name and email.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5 mt-0">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <p id="email" className="text-sm text-muted-foreground border rounded-md h-9 px-3 py-1.5 bg-muted sm:h-10 sm:py-2">
                {userEmail || "-"}
              </p>
              <p className="text-xs text-muted-foreground">Your login email (cannot be changed here).</p>
            </div>
            
            <div className="space-y-1.5 mt-4">
              <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSuccess(''); 
                    setError(''); 
                  }}
                  disabled={updating || isGeneratingName}
                  className="flex-grow rounded-md h-9 sm:h-10"
                  placeholder="E.g., HappyPanda"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateRandomName}
                  disabled={updating || isGeneratingName}
                  className="rounded-md h-9 sm:h-10 w-full sm:w-auto flex-shrink-0"
                >
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${isGeneratingName ? 'animate-spin-fast' : ''}`} />
                  Random Name
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Enter a name or generate a random one.</p>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              size="sm"
              onClick={handleUpdateProfile}
              disabled={isGeneratingName || updating || !name.trim() || name === profile?.name}
              className="w-full sm:w-auto rounded-md h-9 sm:h-10"
            >
              {updating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
