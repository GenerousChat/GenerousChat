"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/magicui/blur-fade";
import { ShinyButton } from "@/components/ui/magicui/shiny-button";
import { User, RefreshCw, Save, Shield, Loader2, ArrowLeft } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <BlurFade delay={0.2}>
          <p className="text-muted-foreground">Loading your profile...</p>
        </BlurFade>
      </div>
    );
  }
  
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="container max-w-2xl">
        <BlurFade delay={0.1} className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </BlurFade>
        
        <BlurFade delay={0.2}>
          <Card className="rounded-xl shadow-xl border bg-card text-card-foreground">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <CardTitle>Profile Details</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Update your profile information that will be visible to others in chat rooms.
              </CardDescription>
              {error && (
                <BlurFade className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {error}
                </BlurFade>
              )}
              {success && (
                <BlurFade className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{success}</span>
                </BlurFade>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    className="h-11 rounded-lg bg-background/80 border-muted-foreground/20 focus:border-primary/60"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateRandomName}
                    disabled={loading}
                    className="rounded-lg flex gap-2 items-center border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Random</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This name will be visible to other users in chat rooms
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <ShinyButton
                onClick={handleUpdateProfile}
                disabled={updating || !name.trim() || (profile?.name === name)}
                className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-2 justify-center ${
                  (updating || !name.trim() || (profile?.name === name)) 
                    ? 'opacity-70 cursor-not-allowed bg-muted hover:bg-muted' 
                    : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                }`}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className={`h-4 w-4 ${(!name.trim() || (profile?.name === name)) ? 'text-muted-foreground' : 'text-white dark:text-primary-foreground'}`} />
                    <span className={`${(!name.trim() || (profile?.name === name)) ? 'text-muted-foreground' : 'text-white dark:text-primary-foreground'}`}>
                      Save Changes
                    </span>
                  </>
                )}
              </ShinyButton>
              <Button 
                variant="outline" 
                onClick={() => router.push("/")}
                className="w-full rounded-lg flex gap-2 items-center justify-center border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </CardFooter>
          </Card>
        </BlurFade>
      </div>
    </div>
  );
}
