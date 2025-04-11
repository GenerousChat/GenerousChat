import React from 'react';

interface VisualizationPanelProps {
  latestHtmlContent: string | null;
  defaultHtmlContent: string;
  generations: any[];
  selectedGenerationId: string | null;
  setSelectedGenerationId: (id: string) => void;
  setLatestHtmlContent: (html: string) => void;
}

export function VisualizationPanel({
  latestHtmlContent,
  defaultHtmlContent,
  generations,
  selectedGenerationId,
  setSelectedGenerationId,
  setLatestHtmlContent
}: VisualizationPanelProps) {
  return (
    <div className="w-1/3 ml-4 border rounded-lg overflow-hidden bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Conversation Visualization</h3>
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
