// Type definitions for client-template-renderer
import React from 'react';

export interface ClientTemplateRendererProps {
  templateId: string;
  props: any;
  onClose: () => void;
}

export function ClientTemplateRenderer(props: ClientTemplateRendererProps): React.ReactElement; 