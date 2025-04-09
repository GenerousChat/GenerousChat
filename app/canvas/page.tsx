import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Canvas from "@/components/canvas/canvas";

export default async function CanvasPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full p-0 m-0">
      <Canvas 
        currentUser={user}
      />
    </div>
  );
}