# File Storage
## YoonOS — Supabase Storage Integration

**For AI Coding Agents:** This file specifies how files, photos, and wallpapers are stored in Supabase Storage. Read database-schema.md first. The `photos` table and `files` table defined there are the database side of what this document covers on the storage side.

---

## Overview

Supabase Storage is used for three categories of binary/large data:

| Bucket | Contents | Who uploads | Who reads |
|---|---|---|---|
| `wallpapers` | Custom wallpaper images uploaded by users | User (via System Settings) | User (on desktop load) |
| `photos` | Images captured by Photo Booth | App (on webcam capture) | User, Agent |
| `user-files` | Files uploaded by the user (PDFs, images, etc.) | User (via Files app or drag-drop) | User, Agent |

Text file content (from Text Edit) is stored directly in the `files` database table as text — not in Storage. Storage is for binary/large files.

---

## Bucket Setup in Supabase Dashboard

Go to **Storage** in the Supabase dashboard and create three buckets. Settings for each:

### Bucket: `wallpapers`
- **Public:** No (private — only the owning user can read their wallpaper)
- **File size limit:** 10 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

### Bucket: `photos`
- **Public:** No
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/png`

### Bucket: `user-files`
- **Public:** No
- **File size limit:** 25 MB
- **Allowed MIME types:** `image/*, application/pdf, text/*`

---

## Storage Policies (Run in Supabase SQL Editor)

Supabase Storage uses its own RLS-style policies. Run this SQL after creating the buckets.

```sql
-- WALLPAPERS BUCKET

-- Users can upload their own wallpaper
create policy "Users can upload own wallpaper"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wallpapers' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own wallpaper
create policy "Users can read own wallpaper"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'wallpapers' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own wallpaper
create policy "Users can delete own wallpaper"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wallpapers' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- PHOTOS BUCKET

create policy "Users can upload own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- USER-FILES BUCKET

create policy "Users can upload own files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**File path convention:** All files follow the pattern `{bucket}/{user_id}/{filename}`. The storage policy enforces that the first folder segment matches the authenticated user's ID. This prevents any user from accessing another user's files.

---

## Photo Booth: Capture and Store

When the user (or agent) triggers a photo capture:

1. The webcam frame is drawn to a canvas element.
2. The canvas is exported as a PNG blob.
3. The blob is uploaded to Supabase Storage under `photos/{user_id}/{uuid}.png`.
4. A row is inserted into the `photos` database table with the storage path.
5. The UI displays a signed URL for the new photo.

```typescript
// lib/storage/photos.ts
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export async function captureAndStorePhoto(
  canvasElement: HTMLCanvasElement
): Promise<{ storagePath: string; signedUrl: string } | null> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return null;

  // Convert canvas to blob
  const blob = await new Promise<Blob | null>((resolve) =>
    canvasElement.toBlob(resolve, 'image/png')
  );
  if (!blob) return null;

  const photoId = crypto.randomUUID();
  const storagePath = `${userId}/${photoId}.png`;

  // Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, blob, { contentType: 'image/png' });

  if (uploadError) {
    console.error('Photo upload failed:', uploadError.message);
    return null;
  }

  // Insert metadata row
  const { error: dbError } = await supabase
    .from('photos')
    .insert({ user_id: userId, storage_path: storagePath });

  if (dbError) {
    console.error('Photo DB insert failed:', dbError.message);
    return null;
  }

  // Get a signed URL valid for 1 hour
  const { data } = await supabase.storage
    .from('photos')
    .createSignedUrl(storagePath, 3600);

  return { storagePath, signedUrl: data?.signedUrl ?? '' };
}

export async function getRecentPhotos(limit = 3): Promise<string[]> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return [];

  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (!photos) return [];

  const signedUrls = await Promise.all(
    photos.map((p) =>
      supabase.storage.from('photos').createSignedUrl(p.storage_path, 3600)
    )
  );

  return signedUrls
    .map((r) => r.data?.signedUrl)
    .filter(Boolean) as string[];
}
```

---

## Text Edit: Syncing to Database

Text files do NOT use Storage. Their content is stored as text in the `files` table. The Zustand store syncs to Supabase on every save.

```typescript
// lib/storage/textFiles.ts
import { supabase } from '@/lib/supabase/client';
import { DBFile } from '@/types';

export async function loadUserFiles(userId: string): Promise<DBFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function saveFile(
  fileId: string | null,
  userId: string,
  name: string,
  content: string
): Promise<DBFile | null> {
  if (fileId) {
    // Update existing
    const { data, error } = await supabase
      .from('files')
      .update({ name, content })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('files')
      .insert({ user_id: userId, name, content })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data;
  }
}

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId);
  return !error;
}
```

---

## Wallpaper Storage

Custom wallpapers uploaded by the user are stored in the `wallpapers` bucket. See `system-settings.md` for the upload flow and UI. Storage helper:

```typescript
// lib/storage/wallpapers.ts
import { supabase } from '@/lib/supabase/client';

export async function uploadWallpaper(
  userId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const storagePath = `${userId}/wallpaper.${ext}`;

  // Upsert: replaces existing wallpaper file
  const { error } = await supabase.storage
    .from('wallpapers')
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (error) { console.error(error); return null; }

  const { data } = await supabase.storage
    .from('wallpapers')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7-day URL

  return data?.signedUrl ?? null;
}
```

---

## Agent: Reading User Files

The agent can call a `read_user_file` tool to read a file the user has in their Text Edit. The tool handler fetches the content from the database.

```typescript
// In lib/agent/toolHandlers.ts — add this handler
async function handle_read_user_file(input: { file_name: string }, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('files')
    .select('name, content')
    .eq('user_id', userId)
    .ilike('name', `%${input.file_name}%`)
    .limit(1)
    .single();

  if (error || !data) return `No file found matching "${input.file_name}".`;
  return `File: ${data.name}\n\n${data.content}`;
}
```

Add this to the agent's tool schema in `lib/agent/tools.ts`:

```typescript
{
  name: 'read_user_file',
  description: 'Reads the content of a file in the user\'s Text Edit by name.',
  input_schema: {
    type: 'object',
    properties: {
      file_name: {
        type: 'string',
        description: 'The name (or partial name) of the file to read.',
      },
    },
    required: ['file_name'],
  },
},
```

---

## Updated textEditStore.ts (with Supabase sync)

Replace the original Zustand store with this version that syncs to Supabase.

```typescript
// stores/textEditStore.ts
import { create } from 'zustand';
import { DBFile } from '@/types';
import { loadUserFiles, saveFile, deleteFile } from '@/lib/storage/textFiles';

type TextEditStore = {
  files: DBFile[];
  activeFileId: string | null;
  isLoading: boolean;
  loadFiles: (userId: string) => Promise<void>;
  setActiveFile: (id: string) => void;
  createFile: (userId: string) => Promise<void>;
  updateContent: (content: string) => void;
  saveActiveFile: (userId: string) => Promise<void>;
  renameFile: (id: string, name: string, userId: string) => Promise<void>;
  removeFile: (id: string, userId: string) => Promise<void>;
};

export const useTextEditStore = create<TextEditStore>((set, get) => ({
  files: [],
  activeFileId: null,
  isLoading: false,
  loadFiles: async (userId) => {
    set({ isLoading: true });
    const files = await loadUserFiles(userId);
    set({ files, activeFileId: files[0]?.id ?? null, isLoading: false });
  },
  setActiveFile: (id) => set({ activeFileId: id }),
  createFile: async (userId) => {
    const saved = await saveFile(null, userId, 'Untitled', '');
    if (saved) set((s) => ({ files: [saved, ...s.files], activeFileId: saved.id }));
  },
  updateContent: (content) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === s.activeFileId ? { ...f, content } : f)),
    })),
  saveActiveFile: async (userId) => {
    const { files, activeFileId } = get();
    const file = files.find((f) => f.id === activeFileId);
    if (!file) return;
    const saved = await saveFile(file.id, userId, file.name, file.content);
    if (saved) set((s) => ({ files: s.files.map((f) => (f.id === saved.id ? saved : f)) }));
  },
  renameFile: async (id, name, userId) => {
    const file = get().files.find((f) => f.id === id);
    if (!file) return;
    const saved = await saveFile(id, userId, name, file.content);
    if (saved) set((s) => ({ files: s.files.map((f) => (f.id === saved.id ? saved : f)) }));
  },
  removeFile: async (id, userId) => {
    const ok = await deleteFile(id, userId);
    if (ok) {
      set((s) => {
        const remaining = s.files.filter((f) => f.id !== id);
        return { files: remaining, activeFileId: remaining[0]?.id ?? null };
      });
    }
  },
}));
```

---

## Verification Checklist

- [ ] Three storage buckets exist in Supabase: `wallpapers`, `photos`, `user-files`.
- [ ] Storage policies are in place (verified in Supabase Storage > Policies).
- [ ] Photo Booth capture uploads to `photos/{user_id}/{uuid}.png` and inserts a DB row.
- [ ] Text Edit saves to the `files` table, not to Storage.
- [ ] Signed URLs work for displaying stored photos.
- [ ] Files reload correctly when the user logs in again.
- [ ] The agent `read_user_file` tool returns correct content.
