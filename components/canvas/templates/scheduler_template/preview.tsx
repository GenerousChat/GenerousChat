"use client";

import React from 'react';
import type { SchedulerPropsType } from './schema';

export function Scheduler({ 
  activities, 
  title = "Weekly Schedule", 
  subtitle,
  colorTheme = 'blue', 
  showWeekends = true,
  layout = 'grid'
}: SchedulerPropsType) {
  // Theme colors map
  const themeColors = {
    blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
    red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' },
    gray: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' },
  };

  const theme = themeColors[colorTheme];
  
  // Filter out weekends if showWeekends is false
  const filteredActivities = showWeekends 
    ? activities 
    : activities.filter(a => !['Saturday', 'Sunday'].includes(a.date));

  return (
    <div className="scheduler-container w-full p-4">
      <header className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </header>

      {layout === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredActivities.map((activity, index) => (
            <div 
              key={index} 
              className={`rounded-lg shadow p-4 border-l-4 ${theme.border} ${activity.color ? '' : theme.bg}`}
              style={activity.color ? { backgroundColor: activity.color } : {}}
            >
              <div className="font-bold text-gray-700">{activity.date}</div>
              {activity.time && <div className="text-sm text-gray-500">{activity.time}</div>}
              <div className="text-lg mt-1 font-medium">{activity.label}</div>
              {activity.description && (
                <div className="mt-2 text-sm text-gray-600">{activity.description}</div>
              )}
              {activity.duration && (
                <div className="mt-2 text-xs text-gray-500">Duration: {activity.duration}</div>
              )}
              {activity.complete !== undefined && (
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activity.complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.complete ? 'Completed' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {layout === 'vertical' && (
        <div className="flex flex-col space-y-3">
          {filteredActivities.map((activity, index) => (
            <div 
              key={index} 
              className={`flex items-center rounded-lg shadow p-4 border-l-4 ${theme.border} ${activity.color ? '' : theme.bg}`}
              style={activity.color ? { backgroundColor: activity.color } : {}}
            >
              <div className="font-bold text-gray-700 w-24">{activity.date}</div>
              <div className="flex-1">
                <div className="text-lg font-medium">{activity.label}</div>
                {activity.description && (
                  <div className="mt-1 text-sm text-gray-600">{activity.description}</div>
                )}
              </div>
              {activity.time && (
                <div className="text-sm text-gray-500">{activity.time}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {layout === 'horizontal' && (
        <div className="overflow-x-auto">
          <div className="flex space-x-4 pb-4">
            {filteredActivities.map((activity, index) => (
              <div 
                key={index} 
                className={`flex-shrink-0 w-64 rounded-lg shadow p-4 border-t-4 ${theme.border} ${activity.color ? '' : theme.bg}`}
                style={activity.color ? { backgroundColor: activity.color } : {}}
              >
                <div className="font-bold text-gray-700">{activity.date}</div>
                {activity.time && <div className="text-sm text-gray-500">{activity.time}</div>}
                <div className="text-lg mt-1 font-medium">{activity.label}</div>
                {activity.description && (
                  <div className="mt-2 text-sm text-gray-600">{activity.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 