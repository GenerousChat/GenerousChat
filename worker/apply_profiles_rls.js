// Script to apply the updated profiles RLS policies
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

async function applyRlsUpdates() {
  try {
    console.log('Applying profiles RLS policy updates...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'update_profiles_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply the migration using direct SQL query with service role
    const { error } = await supabase.rpc('pgmoon.query', { query: migrationSQL });
    
    if (error) {
      console.error('Error applying RLS updates:', error);
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log(migrationSQL);
    } else {
      console.log('RLS policies updated successfully!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyRlsUpdates();
