'use client';

import React from 'react';
import TimeAgo from 'react-timeago';

interface TimeAgoDisplayProps {
  date: string | number | Date;
  className?: string;
}

const TimeAgoDisplay: React.FC<TimeAgoDisplayProps> = ({ date, className }) => {
  return (
    <TimeAgo date={date} className={className} />
  );
};

export default TimeAgoDisplay;
