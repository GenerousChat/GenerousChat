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
}

export function CanvasPanel({
  latestHtmlContent,
  defaultHtmlContent,
  generations,
  selectedGenerationId,
  setSelectedGenerationId,
  setLatestHtmlContent,
  user,
  messages
}: CanvasPanelProps) {

  return (
    <div>
      <Canvas 
        currentUser={user}
        messages={messages}
      />
    </div>
  );
}
