import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, canvasId, data } = body;
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Validate input
    if (!type || !canvasId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Handle different event types
    switch (type) {
      case 'message':
        // Send message event
        if (!data.message) {
          return NextResponse.json(
            { error: 'Missing message content' },
            { status: 400 }
          );
        }
        
        await pusher.trigger(`canvas-${canvasId}`, 'message', {
          message: data.message
        });
        break;
        
      case 'visualization':
        // Handle template-based visualization
        if (data.renderMethod === 'jsx' && data.templateId && data.templateProps) {
          await pusher.trigger(`canvas-${canvasId}`, 'visualization', {
            templateId: data.templateId,
            data: data.templateProps,
            renderMethod: 'jsx'
          });
        }
        // Handle HTML-based visualization
        else if (data.html) {
          await pusher.trigger(`canvas-${canvasId}`, 'visualization', {
            html: data.html,
            renderMethod: 'fallback_iframe'
          });
        } else {
          return NextResponse.json(
            { error: 'Missing visualization content' },
            { status: 400 }
          );
        }
        break;
        
      case 'error':
        // Send error event
        if (!data.message) {
          return NextResponse.json(
            { error: 'Missing error message' },
            { status: 400 }
          );
        }
        
        await pusher.trigger(`canvas-${canvasId}`, 'error', {
          message: data.message
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in Pusher API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}