import AuthButton from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container flex justify-between items-center py-3">
          <Link href="/" className="font-bold text-xl">
            Chat Rooms
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </header>
      <div className="flex-1 container py-4">{children}</div>
    </div>
  );
}
