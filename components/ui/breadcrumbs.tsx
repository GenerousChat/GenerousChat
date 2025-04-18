"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from "@/utils/supabase/client";
// Remove Badge & TimeAgoDisplay for now

// Define the authentication paths where "Home" should be excluded
const authPaths = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

// Simplified BreadcrumbItem - no metadata
interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

// Define props for the component, including the optional callback
interface BreadcrumbsProps {
  onLinkClick?: () => void; // Optional callback function
}

// Accept the onLinkClick prop
export function Breadcrumbs({ onLinkClick }: BreadcrumbsProps) {
  const pathname = usePathname();
  // State similar to MobileMenu
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState<boolean>(false);

  // Simpler fetch useEffect, only for name
  useEffect(() => {
    const fetchRoomName = async () => {
      const pathSegments = pathname.split('/').filter(Boolean);
      let roomId: string | null = null;
      if (pathSegments.length >= 2 && pathSegments[0] === 'chat') {
        roomId = pathSegments[1];
      }

      if (!roomId) {
        setRoomName(null);
        setIsLoadingName(false);
        return;
      }
      
      // Avoid refetch if name already exists for this path? (Optional optimization)
      // if (roomName && pathname.endsWith(roomId)) return; 

      setIsLoadingName(true);
      setRoomName(null); // Clear old name
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('name') // Select only name
          .eq('id', roomId)
          .single();

        if (data && !error) {
          console.log(`[Breadcrumbs Simplified] Fetch successful for ${roomId}. Name: ${data.name}`);
          setRoomName(data.name);
        } else if (error) {
          console.error(`[Breadcrumbs Simplified] Supabase error fetching name for room ${roomId}:`, error);
          setRoomName(null);
        } else {
           console.warn(`[Breadcrumbs Simplified] No name data/error for room ${roomId}.`);
           setRoomName(null);
        }
      } catch (error) {
        console.error(`[Breadcrumbs Simplified] Exception fetching name for room ${roomId}:`, error);
        setRoomName(null);
      } finally {
        setIsLoadingName(false);
      }
    };

    fetchRoomName();
    // Dependency only on pathname (or derived roomId if stable)
  }, [pathname]); 

  // Remove the second useEffect - build breadcrumbs directly in render

  // --- Build Breadcrumbs Logic --- 
  if (!pathname) return null;
  const pathSegments = pathname.split('/').filter(Boolean);

  // Conditionally initialize breadcrumbs
  const isAuthPath = authPaths.includes(pathname);
  const breadcrumbItems: BreadcrumbItem[] = isAuthPath
    ? [] // Start empty for auth paths
    : [{ label: 'Home', href: '/chat', isCurrent: pathname === '/chat' }]; // Point Home to Lobby

  let currentPath = '';
  let finalLabelForRoom = ''; // Store the final label determined for the room segment

  pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      let label = segment;
      const isCurrent = currentPath === pathname;

      if (segment === 'chat' && index === 0) {
        label = 'Lobby';
      } else if (pathSegments[0] === 'chat' && index === 1) {
        // Determine the label for the room segment based on state
        if (isLoadingName) {
            label = 'Loading...';
        } else {
            // Use fetched name, fallback to ID if name is null/empty
            label = roomName || segment; 
        }
        finalLabelForRoom = label; // Store this label
        // Don't add the intermediate step like /chat/id to breadcrumbs list
        if (!isCurrent) return;
        // If current, use the determined label
        label = finalLabelForRoom;
      } else if (segment === 'profile' && index === 0) { // Handle /profile
        label = 'Profile';
        // No need to prepend Lobby since Home now points to lobby
      } else {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isCurrent,
      });
  });
  // If the loop finished without adding the current room page (because return was hit)
  // ensure it gets added with the correct label
  if (pathSegments[0] === 'chat' && pathSegments.length > 1 && breadcrumbItems[breadcrumbItems.length - 1]?.href !== pathname) {
       breadcrumbItems.push({
            label: finalLabelForRoom || 'Room', // Use stored label or fallback
            href: pathname,
            isCurrent: true
        });
  }
  // ----------------------------

  // Adjust the condition: Only hide for the root path or if the list is truly empty
  if (pathname === '/' || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-lg whitespace-nowrap overflow-x-auto py-1">
      {breadcrumbItems.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.href}>
          {index > 0 && (
            <span className="text-muted-foreground">/</span>
          )}
          
          {breadcrumb.isCurrent ? (
            // Simplified rendering - just the label
            <span className="font-medium text-foreground">
                {breadcrumb.label}
            </span>
          ) : (
            // Add onClick handler to the Link element
            <Link 
              href={breadcrumb.href} 
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={onLinkClick} // Call the passed function on click
            >
                {breadcrumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
