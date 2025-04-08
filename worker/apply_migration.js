// Script to apply migrations to Supabase
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
    
    console.log('Applying migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      return false;
    }
    
    console.log('Migration applied successfully!');
    return true;
  } catch (error) {
    console.error('Error in applyMigration:', error);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    console.log('Usage: node apply_migration.js <migration_file_path>');
    process.exit(1);
  }
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }
  
  const success = await applyMigration(fullPath);
  
  if (success) {
    console.log('Migration completed successfully');
  } else {
    console.error('Migration failed');
    process.exit(1);
  }
}

main();
