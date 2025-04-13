// Script to apply the profiles table migration
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

async function applyMigration() {
  try {
    console.log('Applying profiles table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_profiles_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply the migration
    const { error } = await supabase.rpc('pgmoon.query', { query: migrationSQL });
    
    if (error) {
      console.error('Error applying migration:', error);
      
      // Alternative approach if rpc method is not available
      console.log('Trying alternative approach...');
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log(migrationSQL);
    } else {
      console.log('Migration applied successfully!');
      
      // Create profiles for existing users
      console.log('Creating profiles for existing users...');
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (users) {
        for (const user of users.users) {
          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (!existingProfile) {
            // Generate a random name
            const { data: randomName } = await supabase.rpc('generate_random_name');
            
            // Create profile
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                name: randomName || `User${Math.floor(Math.random() * 10000)}`
              });
            
            if (insertError) {
              console.error(`Error creating profile for user ${user.id}:`, insertError);
            } else {
              console.log(`Created profile for user ${user.id}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyMigration();
