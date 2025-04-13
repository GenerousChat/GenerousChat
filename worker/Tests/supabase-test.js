// Test script to insert a message into Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to get existing room_id from room_participants table
async function getExistingRoomId() {
  console.log('Fetching existing room_id from room_participants...');
  
  const { data, error } = await supabase
    .from('room_participants')
    .select('room_id')
    .limit(1);
  
  if (error) {
    console.error('Error fetching room_participants:', error);
    return null;
  }
  
  if (data && data.length > 0) {
    console.log('Found existing room_id:', data[0].room_id);
    return data[0].room_id;
  }
  
  console.log('No existing room_participants found');
  return null;
}

async function insertTestMessage() {
  console.log('Inserting test message into Supabase...');
  
  // First get a valid room_id
  const roomId = await getExistingRoomId();
  
  if (!roomId) {
    console.error('No valid room_id found. Please create a room first.');
    return;
  }
  
  // Use a valid user_id from room_participants
  const { data: userData, error: userError } = await supabase
    .from('room_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .limit(1);
  
  if (userError || !userData || userData.length === 0) {
    console.error('Error fetching user_id:', userError || 'No users found');
    return;
  }
  
  const userId = userData[0].user_id;
  console.log('Using user_id:', userId);
  
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        room_id: roomId,
        user_id: userId,
        content: 'Test message from Supabase insert script - ' + new Date().toISOString()
      }
    ])
    .select();
  
  if (error) {
    console.error('Error inserting test message:', error);
    return;
  }
  
  console.log('Test message inserted successfully:', data);
}

// Run the test
insertTestMessage();
