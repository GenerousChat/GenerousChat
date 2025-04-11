import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint for storing canvas elements (messages, drawings, etc.)
 * POST /api/canvas-element
 * 
 * Request Body for messages:
 * {
 *   "canvasId": "unique-canvas-identifier",
 *   "type": "message",
 *   "message": {
 *     "id": "message-id",
 *     "user_id": "user-id", 
 *     "content": "message content",
 *     "created_at": "timestamp"
 *   }
 * }
 */
export async function POST(request: Request) {
  console.log('=== CANVAS ELEMENT API CALLED ===');
  
  try {
    const body = await request.json();
    const { canvasId, type } = body;
    
    if (!canvasId || !type) {
      return NextResponse.json(
        { error: 'Missing canvasId or type' }, 
        { status: 400 }
      );
    }
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Handle different element types
    if (type === 'message') {
      const { message } = body;
      
      if (!message || !message.content) {
        return NextResponse.json(
          { error: 'Missing message content' }, 
          { status: 400 }
        );
      }
      
      // Store message in database
      const { data, error: insertError } = await supabase
        .from('canvas_messages')
        .insert({
          canvas_id: canvasId,
          user_id: user.id,
          content: message.content
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error storing message:', insertError);
        return NextResponse.json(
          { error: 'Failed to store message' }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Canvas message stored',
        messageId: data.id
      });
    }
    // Handle other element types as needed (drawings, annotations, etc.)
    else {
      return NextResponse.json(
        { error: `Unsupported element type: ${type}` }, 
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Unexpected error in canvas element API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 