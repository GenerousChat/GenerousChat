"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from './button';
import { createClient } from "@/utils/supabase/client";

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [roomNames, setRoomNames] = useState<Record<string, string>>({});

  // Fetch room names when needed
  useEffect(() => {
    const fetchRoomNames = async () => {
      if (!pathname.includes('/chat/')) return;
      
      const roomId = pathname.split('/').filter(Boolean)[1];
      if (!roomId || roomNames[roomId]) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('id, name')
          .eq('id', roomId)
          .single();
        
        if (data && !error) {
          setRoomNames(prev => ({
            ...prev,
            [roomId]: data.name
          }));
        }
      } catch (error) {
        console.error('Error fetching room name:', error);
      }
    };
    
    fetchRoomNames();
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;

    // Split pathname and create breadcrumb items
    const pathSegments = pathname.split('/').filter(Boolean);
    
    // Start with home
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Home', href: '/', isCurrent: pathname === '/' }
    ];

    // Build up breadcrumb paths
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Handle dynamic routes with [param]
      let label = segment;
      if (segment.startsWith('[') && segment.endsWith(']')) {
        // For dynamic segments, try to make them more readable
        label = segment.slice(1, -1);
      }
      
      // Special case handling for known routes
      if (segment === 'chat' && index === 0) {
        label = 'Lobby';
      } else if (pathname.includes('/chat/') && index === 1) {
        // For chat room IDs, use the actual room name if available
        label = roomNames[segment] || 'Room';
      }
      
      // Capitalize first letter if it's not already a proper name
      if (!roomNames[segment]) {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isCurrent: currentPath === pathname
      });
    });
    
    setBreadcrumbs(breadcrumbItems);
  }, [pathname, roomNames]);

  // Don't render breadcrumbs on homepage
  if (pathname === '/') return null;
  
  // Don't render if we only have one item (just Home)
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.href}>
          {index > 0 && (
            <span className="text-muted-foreground">/</span>
          )}
          
          {breadcrumb.isCurrent ? (
            <span className="font-medium text-foreground">
              {breadcrumb.label}
            </span>
          ) : (
            <Button size="sm" variant="ghost" asChild>
              <Link href={breadcrumb.href}>
                {breadcrumb.label}
              </Link>
            </Button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
