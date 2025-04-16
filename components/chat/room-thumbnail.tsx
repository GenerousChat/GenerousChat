'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // Import Image component

interface RoomThumbnailProps {
  src: string | null;
  alt: string;
  className?: string;
}

// This component handles image loading and errors for room thumbnails
const RoomThumbnail: React.FC<RoomThumbnailProps> = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Update imgSrc when the src prop changes (e.g., on initial load or data refresh)
  useEffect(() => {
    setImgSrc(src); // Reset src
    setHasError(false); // Reset error state when src changes
  }, [src]);

  const handleError = () => {
    // Don't fallback to placeholder, just set error state
    setHasError(true);
    // console.error(`Error loading image: ${src}`); // Optional: for debugging
  };

  // If there's an error or no initial src, display the fallback text
  if (hasError || !imgSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground text-xs ${className || ''}`}
      >
        No preview
      </div>
    );
  }

  // Otherwise, render the Next.js Image component
  return (
    <Image
      src={imgSrc} // Use the state variable
      alt={alt}
      className={className}
      width={96} // Provide appropriate width (e.g., w-24 -> 96)
      height={96} // Provide appropriate height (e.g., h-24 -> 96)
      onError={handleError}
      unoptimized={true} // Useful if the src is external and not processed by Next.js build
    />
  );
};

export default RoomThumbnail;
