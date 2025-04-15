// @ts-nocheck - Ignore TypeScript errors in this file
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }
) {
  try {

    console.log({ params });
    const generationId = params.id;
    
    if (!generationId) {
      return NextResponse.json({ error: 'Generation ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client - must be awaited
    const supabase = await createClient();
    
    // Query the generation from Supabase
    const { data, error } = await supabase
      .from('canvas_generations')
      .select('*')
      .eq('id', generationId)
      .single();
    
    if (error) {
      console.error('Error fetching generation:', error);
      return NextResponse.json({ error: 'Failed to fetch generation' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }
    
    // If this is an HTML request (browser), return the HTML directly
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
      return new NextResponse(data.html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    
    // Otherwise return the JSON data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting generation:', error);
    return NextResponse.json({ error: 'Failed to get generation' }, { status: 500 });
  }
}
