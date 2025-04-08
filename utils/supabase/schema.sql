-- Create chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Set up Row Level Security (RLS) policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies
CREATE POLICY "Anyone can view chat rooms" 
  ON chat_rooms FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create chat rooms" 
  ON chat_rooms FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms" 
  ON chat_rooms FOR UPDATE 
  USING (auth.uid() = created_by);

-- Messages policies
CREATE POLICY "Room participants can view messages" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = messages.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Room participants can insert messages" 
  ON messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = messages.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- Room participants policies
CREATE POLICY "Anyone can view room participants" 
  ON room_participants FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can join rooms" 
  ON room_participants FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" 
  ON room_participants FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable realtime subscriptions for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
