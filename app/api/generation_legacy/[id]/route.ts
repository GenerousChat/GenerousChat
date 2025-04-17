// @ts-nocheck - Ignore TypeScript errors in this file
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  params : any
) {
  try {
    console.log('Request received for room generations list:', { params });
    const genId = params.id; // Treat the 'id' parameter as roomId

    // Initialize Supabase client
    const supabase = await createClient();

    // Query the generation with the given id
    const { data: generation, error } = await supabase
      .from('chat_room_generations')
      .select('id, created_at, room_id, html') // Select necessary fields
      .eq('id', genId) // Filter by generation id
      .single();

    if (error) {
      console.error('Error fetching generations for room:', error);
      return new NextResponse('Failed to fetch generations', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }

    if (!generation) {
       return new NextResponse('Generation not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
    
    // Always return HTML
    return new NextResponse(generation.html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Error getting generations list:', error);
    return new NextResponse('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
