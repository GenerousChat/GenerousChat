-- Create dyte_meetings table
create table if not exists dyte_meetings (
  id uuid default gen_random_uuid() primary key,
  room_id uuid not null,
  meeting_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Add foreign key constraint
  constraint fk_room_id foreign key (room_id) references rooms(id) on delete cascade,
  
  -- Add unique constraint to prevent duplicate mappings
  constraint unique_room_id unique (room_id)
);

-- Add indexes
create index if not exists dyte_meetings_room_id_idx on dyte_meetings(room_id);
create index if not exists dyte_meetings_meeting_id_idx on dyte_meetings(meeting_id);
