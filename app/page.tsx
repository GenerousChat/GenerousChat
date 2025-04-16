import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generous - Collaborative Development Canvas",
  description: "Build applications visually with your team and AI assistance in real-time. Get started with Generous today.",
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div>
      {/* Hero section */}
      <section>
        <div>
          <div>
          <img src="/hero.png" alt="Hero" />
          </div>
        </div>
      </section>
    </div>
  );
}
