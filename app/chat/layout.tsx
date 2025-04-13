import AuthButton from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import Link from "next/link";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 container py-4">
      {children}
    </div>
  );
}
