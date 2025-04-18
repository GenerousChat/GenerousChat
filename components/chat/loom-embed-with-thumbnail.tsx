'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';

interface LoomEmbedWithThumbnailProps {
  loomUrl: string;
  thumbnailUrl: string;
  thumbnailAlt?: string;
}

export function LoomEmbedWithThumbnail({
  loomUrl,
  thumbnailUrl,
  thumbnailAlt = 'Video thumbnail',
}: LoomEmbedWithThumbnailProps) {
  const [showVideo, setShowVideo] = useState(false);

  // Function to handle showing the video
  function handlePlayClick(event: React.MouseEvent) {
    event.stopPropagation(); // Prevent triggering other clicks if nested
    setShowVideo(true);
  }

  if (showVideo) {
    return (
      <div style={{ position: 'relative', paddingBottom: '53.28125%', height: 0 }}>
        <iframe
          src={loomUrl} // Consider adding autoplay=1 query param if needed
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media" // Added allow attribute for autoplay
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          title="Loom Video Embed"
        ></iframe>
      </div>
    );
  }

  return (
    <div
      className="relative group overflow-hidden rounded-lg bg-black" // Added bg-black for contain letterboxing
      style={{ paddingTop: '53.28125%' }} // Maintain aspect ratio
    >
      {/* Reverted back to next/image */}
      <Image
        src={thumbnailUrl}
        alt={thumbnailAlt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover object-top transition-transform duration-300 group-hover:scale-105" // Added object-top
        priority
      />
      {/* Overlay for the play button */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer" 
        onClick={handlePlayClick} // Moved onClick here
      >
        {/* Button fades in on hover of the main div */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <PlayCircle className="h-16 w-16 text-white/80" />
        </div>
        {/* Default less opaque button state */}
        <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300">
          <PlayCircle className="h-16 w-16 text-white/60" /> 
        </div>
      </div>
    </div>
  );
} 