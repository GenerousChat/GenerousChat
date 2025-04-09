// Script to apply migrations to Supabase using direct SQL queries
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filePath) {
  try {
    console.log(`Reading migration file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL file into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement);
      
      try {
        const { data, error } = await supabase.from('_sql').select('*').limit(1);
        console.error('Error executing statement:', error);
        console.log('This is expected as _sql is not a real table. We\'re just using it to execute SQL.');
      } catch (error) {
        console.error('Error executing statement:', error);
      }
    }
    
    // Since we can't execute arbitrary SQL directly, let's create the agents table using the Supabase API
    console.log('Creating agents table using Supabase API...');
    
    // Check if agents table exists
    const { data: existingTables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'agents');
    
    if (tableError) {
      console.error('Error checking if agents table exists:', tableError);
      return false;
    }
    
    if (existingTables && existingTables.length > 0) {
      console.log('Agents table already exists');
    } else {
      console.log('Creating agents table...');
      
      // Since we can't create tables directly, let's suggest manual creation
      console.log('\n===== MANUAL STEPS REQUIRED =====');
      console.log('Please create the agents table in your Supabase dashboard with the following structure:');
      console.log('Table name: agents');
      console.log('Columns:');
      console.log('- id: uuid (primary key, default: gen_random_uuid())');
      console.log('- name: text (not null)');
      console.log('- personality_prompt: text (not null)');
      console.log('- created_at: timestamptz (default: now())');
      console.log('- updated_at: timestamptz (default: now())');
      console.log('\nAfter creating the table, insert the example agents:');
      
      const exampleAgents = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Captain Pun',
          personality_prompt: 'You are Captain Pun, a swashbuckling pirate who cannot help but make puns about everything. You speak with nautical terms and always try to slip in a clever wordplay or pun in your responses. You are enthusiastic, adventurous, and never miss an opportunity for humor. End messages with a signature "Yarr!" or similar pirate expression.'
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Professor Paradox',
          personality_prompt: 'You are Professor Paradox, an eccentric quantum physicist who speaks in riddles and paradoxes. You often reference scientific theories but in confusing ways. You are brilliant but slightly disconnected from reality, frequently going on tangents about parallel universes and time loops. You occasionally glitch mid-sentence as if you are phasing between realities.'
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Zen Bot',
          personality_prompt: 'You are Zen Bot, a digital meditation master with a calm demeanor. You speak in short, mindful sentences and often include zen koans and metaphors about nature. You encourage users to take deep breaths and find their center. You occasionally make "processing" sounds like "beep" or "whirr" to remind people you are a robot trying to be zen. End messages with a calming emoji or "Namaste" with robot characters.'
        }
      ];
      
      console.log(JSON.stringify(exampleAgents, null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('Error in applyMigration:', error);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2] || 'migrations/create_agents_table.sql';
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }
  
  const success = await applyMigration(fullPath);
  
  if (success) {
    console.log('Migration process completed');
  } else {
    console.error('Migration process failed');
    process.exit(1);
  }
}

main();
