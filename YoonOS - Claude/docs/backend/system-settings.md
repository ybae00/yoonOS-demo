# System Settings App
## YoonOS — Settings, Wallpaper, and User Profile

**For AI Coding Agents:** This file specifies the System Settings app. It is the sixth app in the OS (added alongside the original four). Build it after auth and storage are working. The settings app reads and writes to `user_settings` and `user_profiles` in Supabase.

---

## What System Settings Does

System Settings is a macOS-style preferences app. It gives the user control over their personal OS environment. In Phase 1 it covers three areas:

1. **Wallpaper** — choose from preset gradients, a solid color, or upload a custom image
2. **Profile** — change display name
3. **Account** — view account info (email, member since), sign out

---

## App Layout

The app opens as a standard OS window (draggable, closable). Inside it has a two-column layout:

```
┌─────────────────────────────────────────────┐
│  System Settings                     [close] │
├─────────────┬───────────────────────────────┤
│             │                               │
│  Wallpaper  │   [wallpaper options panel]   │
│             │                               │
│  Profile    │                               │
│             │                               │
│  Account    │                               │
│             │                               │
└─────────────┴───────────────────────────────┘
```

- **Left column:** sidebar with section buttons (Wallpaper, Profile, Account)
- **Right column:** the active section's content
- Active section is highlighted in the sidebar

---

## Section 1 — Wallpaper

### What It Shows

The wallpaper panel has three sub-tabs: **Presets**, **Color**, **Custom**.

#### Presets Tab

A grid of thumbnail cards showing the built-in gradient options. Clicking one applies it immediately and saves to `user_settings`.

Built-in preset values (store as `wallpaper_value` string):

| Name | CSS |
|---|---|
| `gradient-blue` | `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)` |
| `gradient-purple` | `linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #2d1b69 100%)` |
| `gradient-green` | `linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a3d2e 100%)` |
| `gradient-sunset` | `linear-gradient(135deg, #1a0a0a 0%, #2d1515 50%, #3d1a0a 100%)` |
| `gradient-mono` | `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)` |

#### Color Tab

A color picker input (`<input type="color">`). Picking a color sets `wallpaper_type = 'color'` and `wallpaper_value = '#hexcode'`.

#### Custom Tab

A file upload button. Accepts JPG, PNG, WEBP up to 10 MB. On upload:
1. Upload to Supabase Storage at `wallpapers/{user_id}/wallpaper.{ext}` (upsert).
2. Get a signed URL.
3. Set `wallpaper_type = 'custom'` and `wallpaper_value = storagePath`.
4. Derive the display URL from a fresh signed URL on every desktop load.

### How Wallpaper Is Applied on the Desktop

The `Desktop` component reads `useAuthStore().settings.wallpaper_type` and `wallpaper_value` and applies it as a CSS style:

```typescript
// In Desktop.tsx
function getWallpaperStyle(settings: UserSettings | null): React.CSSProperties {
  if (!settings) return { background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' };

  if (settings.wallpaper_type === 'preset') {
    const presets: Record<string, string> = {
      'gradient-blue': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      'gradient-purple': 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #2d1b69 100%)',
      'gradient-green': 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a3d2e 100%)',
      'gradient-sunset': 'linear-gradient(135deg, #1a0a0a 0%, #2d1515 50%, #3d1a0a 100%)',
      'gradient-mono': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
    };
    return { background: presets[settings.wallpaper_value] ?? presets['gradient-blue'] };
  }

  if (settings.wallpaper_type === 'color') {
    return { backgroundColor: settings.wallpaper_value };
  }

  if (settings.wallpaper_type === 'custom') {
    // wallpaper_value is the storage path — generate signed URL on mount
    return {}; // Handled by useEffect that fetches signed URL
  }

  return {};
}
```

For custom wallpapers, use a `useEffect` in `Desktop` to fetch a fresh signed URL from Supabase Storage when the component mounts.

---

## Section 2 — Profile

### What It Shows

- Current display name (editable text input)
- Save button
- Optional: avatar upload (Phase 2 — skip for now)

### Save Flow

```typescript
// In SystemSettingsApp.tsx
async function saveDisplayName(newName: string) {
  const userId = useAuthStore.getState().userId;
  if (!userId) return;

  const { error } = await supabase
    .from('user_profiles')
    .update({ display_name: newName })
    .eq('id', userId);

  if (!error) {
    useAuthStore.getState().updateProfile({ display_name: newName });
  }
}
```

After saving, the top bar should immediately reflect the new display name (it reads from `useAuthStore().profile.display_name`).

---

## Section 3 — Account

### What It Shows

- Email address (read-only)
- Member since date (formatted from `user_profiles.created_at`)
- **Sign Out** button

### Sign Out Flow

```typescript
async function handleSignOut() {
  await supabase.auth.signOut();
  useAuthStore.getState().clearUser();
  router.push('/login');
  router.refresh();
}
```

---

## Saving Settings to Supabase

All settings changes should be saved immediately (no "Apply" button needed for wallpaper and profile name once confirmed). Use this helper:

```typescript
// lib/storage/settings.ts
import { supabase } from '@/lib/supabase/client';
import { UserSettings } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export async function updateUserSettings(
  partial: Partial<Omit<UserSettings, 'id' | 'updated_at'>>
): Promise<boolean> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return false;

  const { error } = await supabase
    .from('user_settings')
    .update(partial)
    .eq('id', userId);

  if (!error) {
    useAuthStore.getState().updateSettings(partial);
    return true;
  }

  console.error('Settings update failed:', error.message);
  return false;
}
```

Usage example (selecting a preset wallpaper):
```typescript
await updateUserSettings({ wallpaper_type: 'preset', wallpaper_value: 'gradient-purple' });
```

---

## Adding System Settings to the Dock

The Dock now has five apps. Add `systemsettings` to the `AppName` type and update all relevant constants.

```typescript
// Update in types/index.ts
export type AppName = 'browser' | 'calendar' | 'photobooth' | 'textedit' | 'systemsettings';

// Update in windowStore.ts
const DEFAULT_SIZES: Record<AppName, { width: number; height: number }> = {
  browser: { width: 800, height: 600 },
  calendar: { width: 600, height: 500 },
  photobooth: { width: 500, height: 450 },
  textedit: { width: 650, height: 520 },
  systemsettings: { width: 580, height: 480 },
};

const APP_TITLES: Record<AppName, string> = {
  browser: 'Browser',
  calendar: 'Calendar',
  photobooth: 'Photo Booth',
  textedit: 'Text Edit',
  systemsettings: 'System Settings',
};
```

Use a gear icon (⚙) from `lucide-react` (`<Settings />`) for the System Settings dock icon.

---

## Loading Settings on Desktop Init

When the user logs in and the desktop loads, settings must be applied immediately before the first render to avoid a flash of the default wallpaper.

In `app/(os)/desktop/page.tsx` (server component), the `settings` are fetched from Supabase before render and passed as props to `DesktopClient`. The `DesktopClient` hydrates `useAuthStore` with them on first mount:

```typescript
// In DesktopClient.tsx (client component)
'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function DesktopClient({ userId, userEmail, profile, settings }) {
  useEffect(() => {
    useAuthStore.getState().setUser(userId, userEmail, profile, settings);
    // Also load files and calendar events for this user
    useTextEditStore.getState().loadFiles(userId);
    useCalendarStore.getState().loadEvents(userId);
  }, [userId, userEmail, profile, settings]);

  // ... render Desktop component
}
```

---

## Verification Checklist

- [ ] System Settings opens from the Dock (gear icon).
- [ ] Wallpaper presets are displayed as thumbnails in a grid.
- [ ] Clicking a preset changes the desktop wallpaper immediately.
- [ ] The wallpaper change persists after page refresh.
- [ ] Color picker changes the wallpaper to a solid color.
- [ ] Custom wallpaper upload works and persists.
- [ ] Display name can be changed and saved.
- [ ] Account section shows correct email and member since date.
- [ ] Sign Out button works and redirects to /login.
- [ ] Top bar shows the correct display name after a profile update.
