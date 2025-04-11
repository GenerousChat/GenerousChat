"use client";

import React from 'react';
import type { TimelinePropsType } from './schema';

export function Timeline({
  events,
  options,
  categories = []
}: TimelinePropsType) {
  // Default options with fallbacks
  const {
    title,
    subtitle,
    layout = 'vertical',
    colorTheme = 'blue',
    enableZoom = true,
    showLabels = true,
    groupByYear = false,
    dateFormat,
    height,
    width,
    scale = 'linear',
    navigationControls = true
  } = options || {};

  // Theme colors map
  const themeColors = {
    blue: { bg: 'bg-blue-50', accent: 'bg-blue-500', text: 'text-blue-800', border: 'border-blue-300', hover: 'hover:bg-blue-100' },
    green: { bg: 'bg-green-50', accent: 'bg-green-500', text: 'text-green-800', border: 'border-green-300', hover: 'hover:bg-green-100' },
    purple: { bg: 'bg-purple-50', accent: 'bg-purple-500', text: 'text-purple-800', border: 'border-purple-300', hover: 'hover:bg-purple-100' },
    red: { bg: 'bg-red-50', accent: 'bg-red-500', text: 'text-red-800', border: 'border-red-300', hover: 'hover:bg-red-100' },
    orange: { bg: 'bg-orange-50', accent: 'bg-orange-500', text: 'text-orange-800', border: 'border-orange-300', hover: 'hover:bg-orange-100' },
    gray: { bg: 'bg-gray-50', accent: 'bg-gray-500', text: 'text-gray-800', border: 'border-gray-300', hover: 'hover:bg-gray-100' },
  };

  const theme = themeColors[colorTheme];
  
  // Create a mapping of categories to their colors if defined
  const categoryColorMap = categories.reduce((map, cat) => {
    map[cat.name] = cat.color || theme.accent;
    return map;
  }, {} as Record<string, string>);

  // Sort events by date if needed (assumes date strings are chronological when sorted)
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Group events by year if requested
  const groupedEvents = groupByYear 
    ? sortedEvents.reduce((groups, event) => {
        const year = new Date(event.date).getFullYear().toString();
        if (!groups[year]) groups[year] = [];
        groups[year].push(event);
        return groups;
      }, {} as Record<string, typeof events>) 
    : null;

  // Basic containment styles
  const containerStyle: React.CSSProperties = {
    maxWidth: width ? `${width}px` : '100%',
    maxHeight: height ? `${height}px` : 'auto',
    overflowY: height ? 'auto' : 'visible'
  };

  // Render vertical timeline
  if (layout === 'vertical') {
    return (
      <div className={`timeline-container ${theme.bg} p-4 rounded-lg shadow`} style={containerStyle}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6 text-center">
            {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        )}
        
        {/* Controls */}
        {navigationControls && (
          <div className="flex justify-end mb-4">
            {enableZoom && (
              <div className="zoom-controls flex space-x-2">
                <button className={`p-1 rounded ${theme.hover} ${theme.border} border`}>
                  <span className="sr-only">Zoom In</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className={`p-1 rounded ${theme.hover} ${theme.border} border`}>
                  <span className="sr-only">Zoom Out</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Timeline content */}
        <div className="timeline-items relative">
          {/* Timeline line */}
          <div className={`absolute left-[19px] top-0 bottom-0 w-1 ${theme.accent}`}></div>
          
          {/* Events */}
          {sortedEvents.map((event, index) => {
            const eventColor = event.color || 
                             (event.category && categoryColorMap[event.category]) || 
                             theme.accent;
            
            return (
              <div key={index} className={`timeline-item relative pl-12 pb-6 ${event.highlighted ? 'opacity-100' : 'opacity-80'}`}>
                {/* Bullet point */}
                <div 
                  className="absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ backgroundColor: eventColor }}
                >
                  {event.icon ? (
                    <span className="text-white">{event.icon}</span>
                  ) : (
                    <span className="w-3 h-3 bg-white rounded-full"></span>
                  )}
                </div>
                
                {/* Card */}
                <div className={`bg-white rounded-lg shadow p-4 ${event.highlighted ? 'ring-2 ring-offset-2' : ''}`} style={{ 
                  borderLeft: `4px solid ${eventColor}`
                }}>
                  <div className="text-sm text-gray-500 mb-1">{event.date}</div>
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  
                  {event.description && (
                    <div className="text-gray-700 mb-3">{event.description}</div>
                  )}
                  
                  {event.image && (
                    <div className="mb-3">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        className="rounded-md w-full max-h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {event.link && (
                    <div className="mt-3">
                      <a 
                        href={event.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`inline-flex items-center text-sm ${theme.text} hover:underline`}
                      >
                        Learn more
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Horizontal timeline (simplified version)
  return (
    <div className={`timeline-container ${theme.bg} p-4 rounded-lg shadow`} style={containerStyle}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
      )}
      
      {/* Horizontal timeline implementation */}
      <div className="relative pb-12">
        {/* Timeline line */}
        <div className={`absolute left-0 right-0 h-1 top-[50px] ${theme.accent}`}></div>
        
        {/* Timeline items */}
        <div className="flex overflow-x-auto space-x-10 pb-6 pt-2 px-4">
          {sortedEvents.map((event, index) => {
            const eventColor = event.color || 
                            (event.category && categoryColorMap[event.category]) || 
                            theme.accent;
                            
            return (
              <div key={index} className="flex flex-col items-center min-w-[200px]">
                {/* Bullet point */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white z-10 mb-3"
                  style={{ backgroundColor: eventColor }}
                >
                  {event.icon ? (
                    <span className="text-white">{event.icon}</span>
                  ) : (
                    <span className="w-3 h-3 bg-white rounded-full"></span>
                  )}
                </div>
                
                {/* Date */}
                <div className="text-sm text-gray-500 mb-2">{event.date}</div>
                
                {/* Card */}
                <div className="bg-white rounded-lg shadow p-4 min-w-[180px]" style={{ 
                  borderTop: `4px solid ${eventColor}`
                }}>
                  <h3 className="text-md font-semibold mb-2">{event.title}</h3>
                  
                  {event.description && (
                    <div className="text-sm text-gray-700 mb-2">{event.description}</div>
                  )}
                  
                  {event.image && (
                    <div className="mb-2">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        className="rounded-md w-full h-20 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation controls */}
      {navigationControls && (
        <div className="flex justify-center space-x-2">
          <button className={`p-2 rounded ${theme.hover} ${theme.border} border`}>
            <span className="sr-only">Scroll Left</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button className={`p-2 rounded ${theme.hover} ${theme.border} border`}>
            <span className="sr-only">Scroll Right</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
} 