import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/server";
import { UserCircle, LogOut } from "lucide-react";
import { ShinyButton } from "@/components/ui/magicui/shiny-button";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasEnvVars) {
    return (
      <>
        <div className="flex gap-4 items-center">
          <div>
            <Badge
              variant={"default"}
              className="font-normal pointer-events-none"
            >
              Please update .env.local file with anon key and url
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={"outline"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={"default"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }
  return user ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {user.email}
      </span>
      <Link href="/profile">
        <ShinyButton className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white dark:text-primary-foreground shadow-md dark:shadow-primary/20 transition-all duration-300">
          <UserCircle className="h-4 w-4" />
          <span>Profile</span>
        </ShinyButton>
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
      <Button asChild size="sm" variant={"default"} className="text-white dark:text-primary-foreground">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
