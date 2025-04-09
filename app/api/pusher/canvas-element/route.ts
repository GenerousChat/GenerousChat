import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { canvasId, element, type, message } = body;
    
    if (!canvasId || (!element && !message)) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Handle different types of data
    if (type === 'message' && message) {
      // Handle message - store it directly in the database
      // Note: This assumes message is already created in the database by the client
      // If not, you would need to create it here

      console.log('Processing canvas message:', message);
      
      return NextResponse.json({
        success: true,
        message: 'Canvas message processed',
        messageId: message.id
      });
    } else if (element) {
      // Store element in the database
      const { data, error } = await supabase
        .from('canvas_elements')
        .insert({
          canvas_id: canvasId,
          user_id: user.id,
          type: element.type,
          properties: element.properties,
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing canvas element:', error);
        return NextResponse.json(
          { error: 'Failed to store canvas element' }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Canvas element stored',
        element: data
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid data type' }, 
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in canvas-element API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}