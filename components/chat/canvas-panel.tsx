import React, { useState } from 'react';
import Canvas from "@/components/canvas/chat-canvas";

interface CanvasPanelProps {
  latestHtmlContent: string | null;
  defaultHtmlContent: string;
  generations: any[];
  selectedGenerationId: string | null;
  setSelectedGenerationId: (id: string) => void;
  setLatestHtmlContent: (html: string) => void;
  user: any;
  messages: any[];
  roomId: string;
}

export function CanvasPanel({
  latestHtmlContent,
  defaultHtmlContent,
  generations,
  selectedGenerationId,
  setSelectedGenerationId,
  setLatestHtmlContent,
  user,
  messages,
  roomId
}: CanvasPanelProps) {

  return (
    <div className={`w-1/3 ml-4 border rounded-lg overflow-hidden bg-gray-50`}>
      <Canvas 
        currentUser={user}
        messages={messages}
        roomId={roomId}

      />
    </div>
  );
}
