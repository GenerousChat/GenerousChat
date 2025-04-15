import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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
