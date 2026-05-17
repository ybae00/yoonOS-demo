# Backend Documentation Index
## YoonOS — Supabase Integration

**For AI Coding Agents:** Read this before any other file in this folder. Then read the files in the order listed below.

---

## Why This Folder Exists

The original plan used in-memory (Zustand) state only — data was lost on page refresh. The updated scope requires:

- Users to create an account with an ID and password
- Each user to have their own persistent desktop (files, calendar, settings, photos)
- Real file upload, storage, and retrieval
- System settings (wallpaper, display name) that survive across sessions

This folder documents everything related to the backend layer that makes these features possible. The backend is powered entirely by **Supabase** — a single service that provides auth, a Postgres database, and file storage.

---

## What Is Supabase

Supabase is an open-source Firebase alternative. For YoonOS, it provides three things:

1. **Auth** — Email + password signup and login. Sessions managed automatically. Each user gets a unique `user_id` (UUID).
2. **Database** — Postgres. All user data (files, calendar events, settings, photos metadata) is stored here. Row Level Security (RLS) ensures each user can only access their own data.
3. **Storage** — S3-compatible file storage. Used for wallpaper images, uploaded files, and Photo Booth captures.

Supabase has a generous free tier. For personal use, it costs nothing.

**SDK:** `@supabase/supabase-js` (install with `npm install @supabase/supabase-js @supabase/ssr`)

---

## Reading Order

| Order | File | Contents |
|---|---|---|
| 1 | `database-schema.md` | Full Postgres schema: all tables, columns, types, foreign keys, RLS policies. Run this SQL in Supabase to set up the database. |
| 2 | `auth-flow.md` | Login/signup screen spec, session management, route protection, Supabase Auth patterns for Next.js. |
| 3 | `file-storage.md` | Storage bucket setup, file upload/download, photo storage, how the agent reads user files. |
| 4 | `system-settings.md` | System Settings app spec: wallpaper picker, profile editing, preferences persistence. |

---

## How Backend Integrates With the Rest of the App

The existing docs (PRD, project-plan, technical-plan) have been updated to reflect the backend. The relationship is:

```
User opens YoonOS URL
    ↓
Auth check (Supabase session)
    ↓ no session          ↓ session exists
Login/Signup page    →   Load user settings from DB
                         Load desktop state
                         → Desktop renders with user's data
```

Every Zustand store that previously held ephemeral data now has a corresponding Supabase table. The stores still act as the local cache (fast, reactive UI), but they sync to Supabase on write and load from Supabase on login.

---

## Environment Variables Added

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only, never expose to client
```

Add all three to Vercel environment variables and to `.env.local` for local development.

---

## New App: System Settings

The backend integration adds one new app to the OS: **System Settings**. It appears in the Dock alongside the original four apps. It allows the user to:

- Change their wallpaper (choose from presets or upload a custom image)
- Edit their display name
- View their account info (email, member since)

System Settings is a P0 feature for the backend phase.

---

## File Map

```
docs/backend/
├── README.md              ← You are here
├── database-schema.md     ← Postgres schema + RLS policies (run this SQL in Supabase)
├── auth-flow.md           ← Login/signup, session handling, route protection
├── file-storage.md        ← Storage buckets, upload/download, agent file access
└── system-settings.md     ← System Settings app: wallpaper, profile, preferences
```
