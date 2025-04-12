"use client";

import React, { useEffect, useRef } from 'react';
import type { ChartPropsType } from './schema';
// We'd need to install chart.js in the actual implementation
// import { Chart as ChartJS, registerables } from 'chart.js';

// This is a mock component for demonstration purposes
// In a real implementation, we would register Chart.js components
// ChartJS.register(...registerables);

// Helper function to normalize props to a consistent format regardless of input format
function normalizeChartProps(props: any) {
  // Check if we have the custom format (array of {label, value, color} objects)
  if (props.data && Array.isArray(props.data) && props.data[0] && 'label' in props.data[0] && 'value' in props.data[0]) {
    console.log('Input is in custom format - converting to Chart.js format');
    
    // Custom format -> Chart.js format
    const labels = props.data.map((item: any) => item.label);
    const values = props.data.map((item: any) => item.value);
    const colors = props.data.map((item: any) => item.color || getRandomColor());
    
    return {
      ...props,
      data: {
        labels: labels,
        datasets: [{
          label: props.title || 'Data',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map((color: string) => color.replace('0.2', '1')),
          borderWidth: 1
        }]
      },
      options: {
        ...props.options,
        plugins: {
          ...props.options?.plugins,
          title: {
            display: !!props.title,
            text: props.title
          },
          legend: {
            display: props.showLegend !== false
          }
        },
        scales: {
          ...props.options?.scales,
          x: {
            ...props.options?.scales?.x,
            title: {
              display: !!props.xAxisLabel,
              text: props.xAxisLabel
            }
          },
          y: {
            ...props.options?.scales?.y,
            title: {
              display: !!props.yAxisLabel,
              text: props.yAxisLabel
            }
          }
        }
      }
    };
  }
  // Check if we have Chart.js format
  else if (props.data && props.data.datasets && Array.isArray(props.data.datasets)) {
    console.log('Input is in Chart.js format - using as is, with additions');
    
    // Add any missing properties to ensure the Chart.js format is complete
    const enhancedProps = {
      ...props,
      options: {
        ...props.options,
        plugins: {
          ...props.options?.plugins,
          title: {
            display: !!(props.options?.plugins?.title?.text || props.title),
            text: props.options?.plugins?.title?.text || props.title || ''
          }
        }
      }
    };
    
    // For debugging, also compute the equivalent custom format
    const equivalentCustomFormat = {
      title: props.title || props.options?.plugins?.title?.text || 'Chart',
      type: props.type || 'bar',
      data: (props.data.labels || []).map((label: string, index: number) => {
        const dataset = props.data.datasets[0] || { data: [] };
        return {
          label: label,
          value: dataset.data[index] || 0,
          color: Array.isArray(dataset.backgroundColor) 
            ? dataset.backgroundColor[index] 
            : dataset.backgroundColor || getRandomColor()
        };
      })
    };
    
    console.log('Equivalent custom format (for reference):', equivalentCustomFormat);
    
    return enhancedProps;
  }
  
  // If we can't determine the format, return the original props with basic defaults
  console.warn('Unknown props format, adding minimal defaults');
  return {
    ...props,
    type: props.type || 'bar',
    data: props.data || {
      labels: ['Default'],
      datasets: [{ label: 'Default', data: [0] }]
    }
  };
}

// Helper for random colors
function getRandomColor() {
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", 
    "#9966FF", "#FF9F40", "#8D87C1", "#83C669"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function Chart(props: any) {
  console.log('Chart component received props:', props);
  
  // Normalize props to Chart.js format regardless of input format
  const chartProps = normalizeChartProps(props);
  console.log('Normalized to Chart.js format:', chartProps);
  
  // Extract standard Chart.js props
  const { 
    type, 
    data, 
    options, 
    width, 
    height,
    theme: rawTheme = 'light'
  } = chartProps;
  
  // Ensure theme is a valid value
  const theme = (rawTheme === 'dark') ? 'dark' : 'light';
  
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

  // Show debugging info if this is a development environment
  const showDebug = process.env.NODE_ENV === 'development';

  return (
    <div className="chart-container" style={containerStyle}>
      <canvas ref={chartRef} />
      
      {/* Show title if present */}
      {props.title && (
        <div className="text-center mt-2 font-medium text-lg">{props.title}</div>
      )}
      
      {/* Development mode debug info */}
      {showDebug && (
        <div className="text-center mt-4 text-sm text-gray-500">
          <p>(This is a preview component. In production, a real Chart.js chart would be rendered here.)</p>
          <details className="mt-2 text-left">
            <summary className="cursor-pointer">Debug: Data Format</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-[200px]">
              {JSON.stringify(props, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
} 