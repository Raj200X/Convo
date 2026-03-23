-- Supabase SQL schema for Convo

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  status_message text default '',
  avatar_url text,
  is_online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- Conversations (DMs or Group wrapper)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'conversation_type' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.conversation_type AS ENUM ('direct', 'group');
  END IF;
END
$$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  group_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Conversation participants
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- member | admin
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Link group to conversation
alter table public.conversations
  add constraint conversations_group_fk
  foreign key (group_id) references public.groups(id) on delete cascade;

-- Messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'message_kind' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.message_kind AS ENUM ('text', 'image', 'file');
  END IF;
END
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public.message_kind not null default 'text',
  content text, -- text or caption
  file_url text, -- for images/files
  file_name text,
  file_size_bytes integer,
  created_at timestamptz default now()
);

-- Message reads
create table if not exists public.message_reads (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- Group invites
create table if not exists public.group_invites (
  token uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.groups enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.group_invites enable row level security;

-- Only authenticated users
create policy "profiles read own + others" on public.profiles for select using (auth.uid() is not null);
create policy "profiles upsert self" on public.profiles for insert with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update using (id = auth.uid());

create policy "conversations select participant" on public.conversations for select using (
  exists(
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

create policy "conversations insert auth" on public.conversations for insert with check (auth.uid() is not null);

create policy "conversation_participants select own convos" on public.conversation_participants for select using (
  exists(
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
  )
);
create policy "conversation_participants insert by creator or admin" on public.conversation_participants for insert with check (
  exists(
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
  or exists(
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid() and cp.role = 'admin'
  )
);
create policy "conversation_participants delete admin" on public.conversation_participants for delete using (
  exists(
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid() and cp.role = 'admin'
  ) or user_id = auth.uid()
);

create policy "groups select participant" on public.groups for select using (
  exists(
    select 1 from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id and cp.user_id = auth.uid()
    where c.group_id = id
  )
);

create policy "messages select in conversations" on public.messages for select using (
  exists(
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  )
);
create policy "messages insert by participant" on public.messages for insert with check (
  exists(
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  )
);

create policy "message_reads select participant" on public.message_reads for select using (
  exists(select 1 from public.conversation_participants cp join public.messages m on m.id = message_id where cp.conversation_id = m.conversation_id and cp.user_id = auth.uid())
);
create policy "message_reads insert self" on public.message_reads for insert with check (user_id = auth.uid());

create policy "group_invites select participant" on public.group_invites for select using (auth.uid() is not null);
create policy "group_invites insert admin" on public.group_invites for insert with check (
  exists(
    select 1 from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id and cp.user_id = auth.uid() and cp.role = 'admin'
    where c.group_id = group_id
  )
);

-- Storage bucket (create through UI/CLI): attachments, public read, authenticated write
-- Enforce 10MB max in client before upload

-- Storage RLS policies for attachments bucket
-- Note: These policies apply to storage.objects table, not a custom bucket table
-- Run these after creating the 'attachments' bucket in Supabase Dashboard > Storage

-- Allow authenticated users to upload files
create policy "Authenticated users can upload files" on storage.objects
  for insert with check (
    bucket_id = 'attachments' 
    and auth.uid() is not null
  );

-- Allow public read access to files
create policy "Public can view files" on storage.objects
  for select using (bucket_id = 'attachments');

-- Allow users to delete their own files
create policy "Users can delete own files" on storage.objects
  for delete using (
    bucket_id = 'attachments' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

