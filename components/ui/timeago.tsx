'use client';

import React from 'react';
import TimeAgo from 'react-timeago';

interface TimeAgoProps {
  date: string | number | Date;
  className?: string;
}

export function RelativeTime({ date, className }: TimeAgoProps) {
  return (
    <span className={className}>
      <TimeAgo 
        date={date} 
        minPeriod={60} // Only update every minute
      />
    </span>
  );
}
