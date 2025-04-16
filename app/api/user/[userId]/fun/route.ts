// @ts-nocheck - Ignore TypeScript errors in this file
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }
) {
  try {

    console.log({ params });
    const userId = params.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client - must be awaited
    const supabase = await createClient();
    
    // Query all messages for the user
    const { data, error } = await supabase
      .from('messages') // Assuming 'messages' is the correct table name
      .select('content') // Only select the content field
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Order newest first
      .limit(50); // Limit to the last 50 messages
    
    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Messages not found' }, { status: 404 });
    }
    
    // Extract just the content strings into an array
    const messageContents = data.map(message => message.content);
    
    // Return the array of message contents as JSON
    // Note: these will be ordered newest to oldest
    return NextResponse.json(messageContents);
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}
