import React, { useState } from 'react';

interface VisualizationPanelProps {
  latestHtmlContent: string | null;
  defaultHtmlContent: string;
  generations: any[];
  selectedGenerationId: string | null;
  setSelectedGenerationId: (id: string) => void;
  setLatestHtmlContent: (html: string) => void;
}

export function CanvasPanel({
  latestHtmlContent,
  defaultHtmlContent,
  generations,
  selectedGenerationId,
  setSelectedGenerationId,
  setLatestHtmlContent
}: VisualizationPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-white' : 'w-1/3 ml-4 border rounded-lg overflow-hidden bg-gray-50'} flex flex-col`}>
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Conversation Visualization</h3>
        <div className="flex gap-2">
          {selectedGenerationId && (
            <>
              <button
                onClick={() => window.open(`/api/generation/${selectedGenerationId}`, '_blank')}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Open in new tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </button>
              <button
                onClick={() => window.open(`/api/generation/${selectedGenerationId}/code`, '_blank')}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                title="View HTML code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H6a1 1 0 01-1-1v-3zm7-1a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {generations.length > 0 && (
        <div className="border-b border-gray-200 p-2 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => {
                  setSelectedGenerationId(gen.id);
                  setLatestHtmlContent(gen.html);
                }}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                  selectedGenerationId === gen.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {new Date(gen.created_at).toLocaleTimeString()}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex-1 p-4">
        <div className="bg-white rounded-md overflow-hidden shadow-sm h-full">
          <iframe
            srcDoc={latestHtmlContent || defaultHtmlContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
            allow="camera; microphone; geolocation; fullscreen"
            title="Conversation Visualization"
          />
        </div>
      </div>
    </div>
  );
}
