-- Create canvas elements table
CREATE TABLE IF NOT EXISTS public.canvas_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvas messages table 
CREATE TABLE IF NOT EXISTS public.canvas_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvas generations table
CREATE TABLE IF NOT EXISTS public.canvas_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id TEXT NOT NULL,
    html TEXT NOT NULL,
    summary TEXT,
    created_by UUID NOT NULL,
    type TEXT NOT NULL DEFAULT 'visualization',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvas_elements_canvas_id ON public.canvas_elements (canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_messages_canvas_id ON public.canvas_messages (canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_generations_canvas_id ON public.canvas_generations (canvas_id);

-- Set up RLS policies for canvas_elements
ALTER TABLE public.canvas_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own canvas elements"
ON public.canvas_elements
FOR SELECT
USING (true);  -- Allow all authenticated users to view canvas elements

CREATE POLICY "Allow users to insert their own canvas elements"
ON public.canvas_elements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own canvas elements"
ON public.canvas_elements
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own canvas elements"
ON public.canvas_elements
FOR DELETE
USING (auth.uid() = user_id);

-- Set up RLS policies for canvas_messages
ALTER TABLE public.canvas_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select canvas messages"
ON public.canvas_messages
FOR SELECT
USING (true);  -- Allow all authenticated users to view canvas messages

CREATE POLICY "Allow users to insert their own canvas messages"
ON public.canvas_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own canvas messages"
ON public.canvas_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own canvas messages"
ON public.canvas_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Set up RLS policies for canvas_generations
ALTER TABLE public.canvas_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select canvas generations"
ON public.canvas_generations
FOR SELECT
USING (true);  -- Allow all authenticated users to view canvas generations

CREATE POLICY "Allow service role to insert canvas generations"
ON public.canvas_generations
FOR INSERT
WITH CHECK (true);  -- Allow service role to insert, will be restricted by application logic

CREATE POLICY "Allow service role to update canvas generations"
ON public.canvas_generations
FOR UPDATE
USING (true);  -- Allow service role to update, will be restricted by application logic

-- Create a function to notify worker when new canvas elements are created
CREATE OR REPLACE FUNCTION public.handle_new_canvas_element()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'canvas_changes',
    json_build_object(
      'type', 'INSERT',
      'table', 'canvas_elements',
      'canvas_id', NEW.canvas_id,
      'record', json_build_object(
        'id', NEW.id,
        'type', NEW.type,
        'user_id', NEW.user_id,
        'properties', NEW.properties
      )
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to notify worker when new canvas messages are created
CREATE OR REPLACE FUNCTION public.handle_new_canvas_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'canvas_changes',
    json_build_object(
      'type', 'INSERT',
      'table', 'canvas_messages',
      'canvas_id', NEW.canvas_id,
      'record', json_build_object(
        'id', NEW.id,
        'content', NEW.content,
        'user_id', NEW.user_id
      )
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up the trigger for new canvas elements
CREATE TRIGGER notify_canvas_element_trigger
AFTER INSERT ON public.canvas_elements
FOR EACH ROW EXECUTE FUNCTION public.handle_new_canvas_element();

-- Set up the trigger for new canvas messages
CREATE TRIGGER notify_canvas_message_trigger
AFTER INSERT ON public.canvas_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_canvas_message();