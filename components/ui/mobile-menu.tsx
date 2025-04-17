'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import type { User } from '@supabase/supabase-js';
import { createClient } from "@/utils/supabase/client";

interface MobileMenuProps {
  user: User | null;
  signOutAction: () => Promise<never>;
}

export function MobileMenu({ user, signOutAction }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [roomName, setRoomName] = useState<string | null>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Determine if it's one of the auth pages directly in the client component
  const authPathsForAbout = ['/sign-in', '/sign-up', '/forgot-password'];
  const shouldShowAboutButton = authPathsForAbout.includes(pathname);

  // Determine if it's the main page directly in the client component
  const isMainPage = pathname === '/';

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const pathSegments = pathname.split('/').filter(Boolean);
  const isChatRoom = pathSegments[0] === 'chat' && pathSegments.length > 1;
  const roomId = isChatRoom ? pathSegments[1] : null;

  useEffect(() => {
    const fetchRoomName = async () => {
      if (roomId) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('chat_rooms')
            .select('name')
            .eq('id', roomId)
            .single();

          if (data && !error) {
            setRoomName(data.name);
          } else {
            console.error('Error fetching room name:', error);
            setRoomName(null);
          }
        } catch (error) {
          console.error('Error fetching room name:', error);
          setRoomName(null);
        }
      } else {
        setRoomName(null);
      }
    };

    fetchRoomName();
  }, [roomId]);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle menu">
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/30"
            onClick={toggleMenu}
            aria-hidden="true"
           />
      )}

      <div
         className={`
           fixed inset-x-0 top-0 bottom-0 z-30 h-screen 
           transform overflow-y-auto bg-background shadow-lg
           transition-transform duration-300 ease-in-out
           ${isOpen ? 'translate-y-0' : '-translate-y-full'}
         `}
       >
         <div className="relative flex h-full flex-col justify-between pt-16 p-6">
             <div className="flex flex-col gap-6">
                 <Button
                   variant="ghost"
                   size="icon"
                   className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                   onClick={toggleMenu}
                   aria-label="Close menu"
                 >
                   <X className="h-5 w-5" />
                 </Button>

                 <div className="space-y-2 pt-4">
                   <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-muted-foreground">Navigation</div>
                   <div className="my-1 h-px bg-muted" />
                   <div className="flex items-center space-x-2 px-2 py-2 text-lg font-medium flex-wrap">
                     <Link href="/" className="hover:underline" onClick={toggleMenu}>Home</Link>
                     <span className="text-muted-foreground">/</span>
                     <Link href="/chat" className="hover:underline" onClick={toggleMenu}>Lobby</Link>
                     {roomId && (
                       <>
                         <span className="text-muted-foreground">/</span>
                         <span className="font-normal text-foreground truncate" title={roomName || roomId}>
                           {roomName || roomId}
                         </span>
                       </>
                     )}
                   </div>
                 </div>

                 <div className="space-y-4">
                     {user ? (
                       <div className="space-y-2">
                         <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-muted-foreground">
                           {user.email}
                         </div>
                         <div className="my-1 h-px bg-muted" />
                         <Link
                           href="/profile"
                           className="flex items-center gap-3 rounded-md px-2 py-2 text-lg font-medium hover:bg-accent"
                           onClick={toggleMenu}
                         >
                           <UserCircle className="h-5 w-5" />
                           <span>Profile</span>
                         </Link>
                         <div className="my-1 h-px bg-muted" />
                         <form action={signOutAction} className="w-full">
                           <button
                             type="submit"
                             className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-lg font-medium text-destructive hover:bg-accent"
                             onClick={toggleMenu}
                           >
                             <LogOut className="h-5 w-5" />
                             <span>Logout</span>
                           </button>
                         </form>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-muted-foreground">Account</div>
                         <div className="my-1 h-px bg-muted" />
                         <Link
                           href="/sign-in"
                           className="block rounded-md px-2 py-2 text-lg font-medium hover:bg-accent"
                           onClick={toggleMenu}
                         >
                           Sign In
                         </Link>
                         <Link
                           href="/sign-up"
                           className="block rounded-md px-2 py-2 text-lg font-medium hover:bg-accent"
                           onClick={toggleMenu}
                         >
                           Sign Up
                         </Link>
                       </div>
                     )}
                 </div>
                 
                 {/* Conditionally add About link here, using shouldShowAboutButton */}
                 {shouldShowAboutButton && (
                   <div className="space-y-2">
                      <div className="my-1 h-px bg-muted" />
                      <Link
                        href="/about"
                        className="block rounded-md px-2 py-2 text-lg font-medium hover:bg-accent"
                        onClick={toggleMenu}
                      >
                        About
                      </Link>
                   </div>
                 )}
             </div>

             <div className="mt-6 border-t border-muted pt-4">
                 <div className="flex items-center justify-between">
                     <span className="text-sm text-muted-foreground">Theme</span>
                     <ThemeSwitcher />
                 </div>
             </div>
         </div>
       </div>
    </div>
  );
} 