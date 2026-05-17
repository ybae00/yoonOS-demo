# Database Schema
## YoonOS — Supabase Postgres

**For AI Coding Agents:** This file contains the complete SQL to run in the Supabase SQL Editor to set up the YoonOS database. Run the statements in the order they appear. Do not change table names or column names — they are referenced throughout the codebase.

---

## Overview of Tables

| Table | Purpose |
|---|---|
| `user_profiles` | Display name, avatar URL — extends Supabase's built-in `auth.users` |
| `user_settings` | Per-user OS preferences: wallpaper, theme, dock settings |
| `files` | Text files created in the Text Edit app |
| `calendar_events` | Events created in the Calendar app |
| `photos` | Metadata for photos taken in Photo Booth (actual images in Storage) |

`auth.users` is managed automatically by Supabase Auth. Do not create a custom users table — reference `auth.users.id` as a foreign key instead.

---

## SQL: Run This in Supabase SQL Editor

### Step 1 — Enable UUID Extension

```sql
-- Supabase enables this by default, but run it to be safe
create extension if not exists "uuid-ossp";
```

---

### Step 2 — user_profiles

Stores public-facing user info. Created automatically when a new user signs up (via a database trigger).

```sql
create table public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;

-- Users can only read and update their own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### Step 3 — user_settings

Stores per-user OS preferences. One row per user. Created alongside the profile via the trigger.

```sql
create table public.user_settings (
  id                  uuid primary key references auth.users(id) on delete cascade,
  wallpaper_type      text not null default 'preset',   -- 'preset' | 'custom' | 'color'
  wallpaper_value     text not null default 'gradient-blue', -- preset name, storage path, or hex color
  dock_position       text not null default 'bottom',   -- 'bottom' (only value for Phase 1)
  updated_at          timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = id);

-- Extend the new user trigger to also create a settings row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  insert into public.user_settings (id)
  values (new.id);

  return new;
end;
$$;
-- (The trigger already exists from Step 2 — this replaces the function body only.)
```

---

### Step 4 — files

Stores text files created in the Text Edit app. Content is stored as text in the database (not in Storage) because text files are small and queried frequently.

```sql
create table public.files (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'Untitled',
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files enable row level security;

create policy "Users can view own files"
  on public.files for select
  using (auth.uid() = user_id);

create policy "Users can insert own files"
  on public.files for insert
  with check (auth.uid() = user_id);

create policy "Users can update own files"
  on public.files for update
  using (auth.uid() = user_id);

create policy "Users can delete own files"
  on public.files for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger files_updated_at
  before update on public.files
  for each row execute procedure public.set_updated_at();
```

---

### Step 5 — calendar_events

Stores events created in the Calendar app.

```sql
create table public.calendar_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,              -- The event date (YYYY-MM-DD)
  title      text not null,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "Users can view own events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on public.calendar_events for update
  using (auth.uid() = user_id);

create policy "Users can delete own events"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- Index for fast date lookups
create index calendar_events_user_date on public.calendar_events(user_id, date);
```

---

### Step 6 — photos

Stores metadata for Photo Booth captures. The actual image files live in Supabase Storage (see file-storage.md). This table stores the path and timestamp.

```sql
create table public.photos (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,    -- Path inside Supabase Storage: photos/{user_id}/{id}.png
  captured_at  timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Users can view own photos"
  on public.photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own photos"
  on public.photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own photos"
  on public.photos for delete
  using (auth.uid() = user_id);

-- Index for latest photo lookup
create index photos_user_captured on public.photos(user_id, captured_at desc);
```

---

### Step 7 — user_file_objects

Stores metadata for binary files uploaded by the user (PDFs, images, etc.). Actual files live in the `user-files` Storage bucket.

```sql
create table public.user_file_objects (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text not null default 'application/octet-stream',
  size         bigint not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.user_file_objects enable row level security;

create policy "Users can view own file objects"
  on public.user_file_objects for select
  using (auth.uid() = user_id);

create policy "Users can insert own file objects"
  on public.user_file_objects for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own file objects"
  on public.user_file_objects for delete
  using (auth.uid() = user_id);

create index user_file_objects_user on public.user_file_objects(user_id, created_at desc);
```

---

## TypeScript Types (Add to types/index.ts)

```typescript
// Add these to the existing types/index.ts

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type WallpaperType = 'preset' | 'custom' | 'color';

export type UserSettings = {
  id: string;
  wallpaper_type: WallpaperType;
  wallpaper_value: string;
  dock_position: 'bottom';
  updated_at: string;
};

export type DBFile = {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DBCalendarEvent = {
  id: string;
  user_id: string;
  date: string;          // "YYYY-MM-DD"
  title: string;
  notes: string | null;
  created_at: string;
};

export type DBPhoto = {
  id: string;
  user_id: string;
  storage_path: string;
  captured_at: string;
};
```

---

## Supabase Client Setup

Create this file. Import `supabase` from here everywhere in the app.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```typescript
// lib/supabase/server.ts  (used in API routes and Server Components)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}
```

---

## Verification Checklist

After running all SQL in the Supabase SQL Editor, verify:

- [ ] All 5 tables appear in the Supabase Table Editor: `user_profiles`, `user_settings`, `files`, `calendar_events`, `photos`
- [ ] RLS is enabled (green shield icon) on all tables
- [ ] All policies are listed under each table
- [ ] The `on_auth_user_created` trigger appears in Database > Triggers
- [ ] The `set_updated_at` function appears in Database > Functions
- [ ] Creating a test user in Supabase Auth automatically creates rows in `user_profiles` and `user_settings`
