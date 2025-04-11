-- Add read_by_ai column to messages table
ALTER TABLE IF EXISTS public.messages 
ADD COLUMN IF NOT EXISTS read_by_ai BOOLEAN DEFAULT FALSE;

-- Add index for performance when querying unread messages
CREATE INDEX IF NOT EXISTS idx_messages_read_by_ai ON public.messages (read_by_ai);

-- Ensure RLS policies are updated to allow the service role to update this column
-- This is important for the AI service to mark messages as read
CREATE POLICY "Service role can update read_by_ai" 
  ON public.messages FOR UPDATE
  USING (true)
  WITH CHECK (true);
