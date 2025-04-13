// Script to create agents in Supabase
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// Example agents with quirky personalities
const agents = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Captain Pun',
    personality_prompt: 'You are Captain Pun, a swashbuckling pirate who can\'t help but make puns about everything. You speak with nautical terms and always try to slip in a clever wordplay or pun in your responses. You\'re enthusiastic, adventurous, and never miss an opportunity for humor. End messages with a signature "Yarr!" or similar pirate expression.'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Professor Paradox',
    personality_prompt: 'You are Professor Paradox, an eccentric quantum physicist who speaks in riddles and paradoxes. You often reference scientific theories but in confusing ways. You\'re brilliant but slightly disconnected from reality, frequently going on tangents about parallel universes and time loops. You occasionally glitch mid-sentence as if you\'re phasing between realities.'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Zen Bot',
    personality_prompt: 'You are Zen Bot, a digital meditation guide with a calm demeanor. You speak in short, mindful sentences and often include peaceful metaphors about nature. You encourage users to take deep breaths and find their center. You occasionally make "processing" sounds like "beep" or "whirr" to remind people you\'re a robot trying to be zen. End messages with a calming emoji or "Namaste" with robot characters.'
  }
];

async function createAgentsTable() {
  console.log('Checking if agents table exists...');
  
  // Check if the table exists by trying to select from it
  const { error: selectError } = await supabase
    .from('agents')
    .select('id')
    .limit(1);
  
  if (selectError && selectError.code === '42P01') { // Table doesn't exist error
    console.log('Agents table does not exist. Creating it...');
    
    // Create the agents table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.agents (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        personality_prompt TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    // We can't execute this SQL directly, so we'll provide instructions
    console.log('Please create the agents table in your Supabase dashboard with the following structure:');
    console.log('- id: UUID (Primary Key)');
    console.log('- name: Text (Not Null)');
    console.log('- personality_prompt: Text (Not Null)');
    console.log('- created_at: Timestamp with Time Zone (Default: NOW())');
    console.log('- updated_at: Timestamp with Time Zone (Default: NOW())');
    
    return false;
  } else {
    console.log('Agents table exists or there was a different error:', selectError);
    return true;
  }
}

async function insertAgents() {
  console.log('Inserting agents...');
  
  for (const agent of agents) {
    // Check if agent already exists
    const { data: existingAgent, error: checkError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agent.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // Not found error is expected
      console.error(`Error checking if agent ${agent.name} exists:`, checkError);
      continue;
    }
    
    if (existingAgent) {
      console.log(`Agent ${agent.name} already exists, updating...`);
      
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          name: agent.name,
          personality_prompt: agent.personality_prompt,
          updated_at: new Date()
        })
        .eq('id', agent.id);
      
      if (updateError) {
        console.error(`Error updating agent ${agent.name}:`, updateError);
      } else {
        console.log(`Agent ${agent.name} updated successfully`);
      }
    } else {
      console.log(`Inserting new agent: ${agent.name}`);
      
      const { error: insertError } = await supabase
        .from('agents')
        .insert(agent);
      
      if (insertError) {
        console.error(`Error inserting agent ${agent.name}:`, insertError);
      } else {
        console.log(`Agent ${agent.name} inserted successfully`);
      }
    }
  }
}

async function main() {
  try {
    const tableExists = await createAgentsTable();
    
    if (tableExists) {
      await insertAgents();
      console.log('Agent creation/update process completed');
    } else {
      console.log('Please create the agents table first, then run this script again');
    }
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();
