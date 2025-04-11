import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint for listing available visualization templates
 * GET /api/canvas/templates
 */
export async function GET(request: Request) {
  console.log('=== TEMPLATES API CALLED ===');
  
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Query templates from database
    const { data: templates, error: queryError } = await supabase
      .from('canvas_templates')
      .select('id, name, description, tags, confidence_threshold');
    
    if (queryError) {
      console.error('Error fetching templates:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch templates' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      templates: templates || []
    });
  } catch (error: any) {
    console.error('Unexpected error in templates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 