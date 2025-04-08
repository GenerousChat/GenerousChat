// Script to list all tables in the Supabase database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('Listing tables in Supabase database...');
  
  // Try to query a known system table to get table information
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  
  const { data, error } = await supabase.rpc('pgrest_sql', { query_text: query });
  
  if (error) {
    console.error('Error listing tables:', error);
    
    // Let's try to query some common tables that might exist
    console.log('Trying to query common tables directly...');
    
    // Try messages table
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.log('Error querying messages table:', messagesError.message);
    } else {
      console.log('Messages table exists, sample data:', messagesData);
    }
    
    // Try users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('Error querying users table:', usersError.message);
    } else {
      console.log('Users table exists, sample data:', usersData);
    }
    
    // Try room_participants table
    const { data: participantsData, error: participantsError } = await supabase
      .from('room_participants')
      .select('*')
      .limit(1);
    
    if (participantsError) {
      console.log('Error querying room_participants table:', participantsError.message);
    } else {
      console.log('Room_participants table exists, sample data:', participantsData);
      
      // If we found room_participants, let's check its structure
      if (participantsData && participantsData.length > 0) {
        console.log('Room_participants structure:', Object.keys(participantsData[0]));
      }
    }
    
    return;
  }
  
  console.log('Tables found:', data);
}

// Run the function
listTables();
