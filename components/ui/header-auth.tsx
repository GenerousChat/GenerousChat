import { signOutAction } from "@/app/actions";
import Link from "next/link";
import { Button } from "./button";
import { createClient } from "@/utils/supabase/server";
import { UserCircle, LogOut } from "lucide-react";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  return user ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {user.email}
      </span>
      <Link href="/profile">
        <div className="flex">
          <UserCircle className="h-4 w-4" />
          <span>Profile</span>
        </div>
      </Link>
      <form action={signOutAction}>
        <Button 
          type="submit" 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"} className="text-black dark:text-primary-foreground">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
