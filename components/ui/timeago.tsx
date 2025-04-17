'use client';

import React from 'react';
import TimeAgo from 'react-timeago';

interface TimeAgoProps {
  date: string | number | Date;
  className?: string;
}

export function RelativeTime({ date, className }: TimeAgoProps) {
  return (
    <TimeAgo 
      date={date} 
      className={className}
      minPeriod={60} // Only update every minute
    />
  );
}
