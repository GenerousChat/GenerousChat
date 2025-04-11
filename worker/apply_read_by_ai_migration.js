/**
 * Apply the read_by_ai column migration to the messages table
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./config/logger');

async function applyMigration() {
  try {
    logger.info('Connecting to Supabase...');
    
    // Create Supabase client with service key for admin privileges
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    logger.info('Applying migration: Adding read_by_ai column to messages table');
    
    // Execute each SQL statement directly
    const { error: alterError } = await supabase
      .from('messages')
      .select('id')
      .limit(1)
      .then(async () => {
        // Table exists, add the column
        return await supabase.rpc('exec_sql', {
          query: 'ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_by_ai BOOLEAN DEFAULT FALSE;'
        });
      })
      .catch(err => {
        logger.error('Error checking messages table:', err);
        return { error: err };
      });
    
    if (alterError) {
      logger.error('Error adding read_by_ai column:', alterError);
      throw alterError;
    }
    
    logger.info('Added read_by_ai column to messages table');
    
    // Create index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_messages_read_by_ai ON public.messages (read_by_ai);'
    });
    
    if (indexError) {
      logger.error('Error creating index:', indexError);
      throw indexError;
    }
    
    logger.info('Created index on read_by_ai column');
    
    // Create policy
    const { error: policyError } = await supabase.rpc('exec_sql', {
      query: `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'messages' AND policyname = 'Service role can update read_by_ai'
        ) THEN
          EXECUTE 'CREATE POLICY "Service role can update read_by_ai" ON public.messages FOR UPDATE USING (true) WITH CHECK (true);';
        END IF;
      END
      $$;`
    });
    
    if (policyError) {
      logger.error('Error creating policy:', policyError);
      throw policyError;
    }
    
    logger.info('Created policy for read_by_ai column');
    logger.info('Migration successfully applied!');
    logger.info('The messages table now has a read_by_ai column.');
    
  } catch (error) {
    logger.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
