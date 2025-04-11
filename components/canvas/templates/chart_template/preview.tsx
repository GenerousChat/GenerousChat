"use client";

import React, { useEffect, useRef } from 'react';
import type { ChartPropsType } from './schema';
// We'd need to install chart.js in the actual implementation
// import { Chart as ChartJS, registerables } from 'chart.js';

// This is a mock component for demonstration purposes
// In a real implementation, we would register Chart.js components
// ChartJS.register(...registerables);

export function Chart({ 
  type, 
  data, 
  options, 
  width, 
  height,
  theme = 'light'
}: ChartPropsType) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  
  // Setup theme colors
  const themeColors = {
    light: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
      gridColor: 'rgba(0, 0, 0, 0.1)'
    },
    dark: {
      backgroundColor: '#1f2937',
      textColor: '#e5e7eb',
      gridColor: 'rgba(255, 255, 255, 0.1)'
    }
  };

  const colors = themeColors[theme];

  // In a real implementation, we would initialize Chart.js here
  useEffect(() => {
    if (!chartRef.current) return;

    // This would be the actual Chart.js implementation
    console.log('Chart would be initialized with:', {
      type,
      data,
      options
    });

    // Mock cleanup function
    return () => {
      console.log('Chart would be destroyed');
    };
  }, [type, data, options, theme]);

  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '400px', // Default height
    backgroundColor: colors.backgroundColor,
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  };

  return (
    <div className="chart-container" style={containerStyle}>
      <canvas ref={chartRef} />
      <div className="text-center mt-4 text-sm text-gray-500">
        (This is a preview component. In production, a real Chart.js chart would be rendered here.)
      </div>
    </div>
  );
} 