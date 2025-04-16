import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Pusher from 'pusher';

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, timestamp } = await request.json();
    
    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Initialize Pusher with server-side credentials
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us3',
      useTLS: true,
    });
    
    // Broadcast the heartbeat to all clients in the room
    await pusher.trigger(`room-${roomId}`, 'heartbeat', {
      user_id: userId,
      timestamp: timestamp || new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Heartbeat sent' 
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
