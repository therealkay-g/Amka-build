-- =============================================================================
-- MESSAGING SYSTEM SCHEMA
-- =============================================================================

-- 1. Conversations Table
-- Stores the "chat rooms". Can be 'private' (2 users) or 'group' (multiple users).
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  name text, -- Only used for group chats
  type text not null check (type in ('private', 'group')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Conversation Participants Table
-- Links users to conversations.
create table conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- 3. Messages Table
-- Stores the actual content of the messages.
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) not null,
  content text, -- Used for text messages or description of media
  message_type text not null check (message_type in ('text', 'audio', 'video', 'image')),
  file_url text, -- Path to the file in Supabase Storage
  created_at timestamptz default now()
);

-- =============================================================================
-- SECURITY & RLS (Row Level Security)
-- =============================================================================

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Conversations: Can view if you are a participant
create policy "participants_can_view_conversations" on conversations
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_id = conversations.id
      and user_id = auth.uid()
    )
  );

-- Participants: Can view if you are a participant
create policy "participants_can_view_participants" on conversation_participants
  for select using (
    exists (
      select 1 from conversation_participants
      where conversation_id = conversation_participants.conversation_id
      and user_id = auth.uid()
    )
  );

-- Messages: Can view/send if you are a participant of the conversation
create policy "participants_can_manage_messages" on messages
  for all using (
    exists (
      select 1 from conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Enable real-time for messages
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table conversation_participants;
