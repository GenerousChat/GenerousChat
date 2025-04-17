// @ts-nocheck - Ignore TypeScript errors in this file
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest
) {
  try {
    // Get room_id from query parameters if provided
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id');
    
    console.log('Request received for generations list', roomId ? `for room: ${roomId}` : 'for all rooms');
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Query generations from Supabase, filtered by room_id if provided
    let query = supabase
      .from('chat_room_generations')
      .select('id, created_at, room_id')
      .order('created_at', { ascending: false });
      
    // Apply room_id filter if provided
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    
    const { data: generations, error } = await query;
    
    if (error) {
      console.error('Error fetching generations:', error);
      return new NextResponse('Failed to fetch generations', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }
    
    if (!generations || generations.length === 0) {
      return new NextResponse('No generations found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
    
    // Group generations by room_id
    const roomGenerations = {};
    generations.forEach(gen => {
      const genRoomId = gen.room_id || 'unknown';
      if (!roomGenerations[genRoomId]) {
        roomGenerations[genRoomId] = [];
      }
      roomGenerations[genRoomId].push(gen);
    });
    
    // Generate HTML with generations grouped by room
    let htmlContent = '';
    Object.keys(roomGenerations).forEach(roomId => {
      htmlContent += `<h2>Room: ${roomId}</h2><ul>`;
      roomGenerations[roomId].forEach(gen => {
        htmlContent += `<li><a href="/api/generation_legacy/${gen.id}">${gen.id} (Created: ${new Date(gen.created_at).toLocaleString()})</a></li>`;
      });
      htmlContent += '</ul>';
    });
    
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${roomId ? `Generations for Room ${roomId}` : 'All Chat Room Generations'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 30px; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 8px 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>${roomId ? `Generations for Room ${roomId}` : 'All Chat Room Generations'}</h1>
        ${htmlContent}
        ${roomId ? '<p><a href="/api/generation_legacy">View all rooms</a></p>' : ''}
      </body>
      </html>
    `;
    
    // Return HTML response
    return new NextResponse(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error getting generations list:', error);
    return new NextResponse('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
