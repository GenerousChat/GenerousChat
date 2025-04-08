import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to chat page
  if (user) {
    redirect("/chat");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-3xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to Chat Rooms</h1>
          <p className="text-xl text-muted-foreground mb-6">
            A place where you can create chat rooms and connect with others in real-time
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-medium mb-2">Create Chat Rooms</h3>
            <p className="text-muted-foreground">
              Create your own chat rooms on any topic and invite others to join.
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-xl font-medium mb-2">Real-time Messaging</h3>
            <p className="text-muted-foreground">
              Send and receive messages instantly with real-time updates.
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-medium mb-2">Join Conversations</h3>
            <p className="text-muted-foreground">
              Discover and join existing chat rooms to connect with others.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
