'use client';

import React from 'react';
import TimeAgo from 'react-timeago';

interface TimeAgoDisplayProps {
  date: string | number | Date;
  className?: string;
}

const TimeAgoDisplay: React.FC<TimeAgoDisplayProps> = ({ date, className }) => {
  return (
    // Apply className to a wrapper span, not directly to TimeAgo
    <span className={className}>
      <TimeAgo date={date} />
    </span>
  );
};

export default TimeAgoDisplay;
