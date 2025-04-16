'use client';

import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react'; // Example placeholder icon

interface RoomThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

const RoomThumbnail: React.FC<RoomThumbnailProps> = ({ src, alt, className }) => {
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
  };

  if (error) {
    // Render a placeholder if the image fails to load
    return (
      <div className={`flex items-center justify-center bg-muted rounded-md ${className}`}>
        <ImageIcon className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default RoomThumbnail;
