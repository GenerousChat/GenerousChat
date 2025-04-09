import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

// Function to calculate MD5 hash
function md5(str: string) {
  return crypto.createHash("md5").update(str).digest("hex");
}

// Function to generate Pusher authentication signature
function generatePusherSignature(stringToSign: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

// Pusher configuration
const pusherConfig = {
  appId: "1971423",
  key: "96f9360f34a831ca1901",
  secret: process.env.PUSHER_SECRET || "c508bc54a2ca619cfab8",
  cluster: "us3",
};

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
    
    // Send to Pusher
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Determine what type of data we're sending
    let eventName = 'new-element';
    let eventData;
    
    if (type === 'message' && message) {
      // Handle message event
      eventName = 'new-canvas-message';
      eventData = JSON.stringify(message);
    } else if (element) {
      // Handle element event
      eventData = JSON.stringify(element);
    } else {
      return NextResponse.json(
        { error: 'Invalid event type or missing data' }, 
        { status: 400 }
      );
    }
    
    const body_pusher = JSON.stringify({
      name: eventName,
      channel: `canvas-${canvasId}`,
      data: eventData,
    });

    const bodyMd5 = md5(body_pusher);
    const stringToSign = `POST\n/apps/${pusherConfig.appId}/events\nauth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
    const signature = generatePusherSignature(stringToSign, pusherConfig.secret);

    const url = `https://api-${pusherConfig.cluster}.pusher.com/apps/${pusherConfig.appId}/events?auth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body_pusher,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Error from Pusher API:', responseText);
      return NextResponse.json(
        { error: 'Failed to send event to Pusher' }, 
        { status: 500 }
      );
    }

    // If we're handling an element, store it in the database
    if (element) {
      // Store the element in the database (should already be done by the client, but this is a failsafe)
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
        message: 'Canvas element sent to Pusher',
        element: data
      });
    } 
    // If we're handling a message, it's already been stored by the client
    else {
      return NextResponse.json({
        success: true,
        message: 'Canvas message sent to Pusher',
        messageId: message.id
      });
    }
  } catch (error) {
    console.error('Error in canvas-element API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}