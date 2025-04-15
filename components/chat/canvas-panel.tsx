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
    <div className={`w-full`}>
      <Canvas 
        currentUser={user}
        messages={messages}
        roomId={roomId}

      />
    </div>
  );
}
