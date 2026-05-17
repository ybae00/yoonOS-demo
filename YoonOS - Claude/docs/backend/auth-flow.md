# Authentication Flow
## YoonOS — Login, Signup, and Session Management

**For AI Coding Agents:** This file specifies exactly how authentication works in YoonOS. Implement it in full before building any app or desktop component. Auth is the gate that everything else passes through.

---

## Overview

YoonOS uses Supabase Auth with email and password. There is no OAuth (no "Sign in with Google") in Phase 1 — just a username (display name) + email + password signup, and email + password login.

The flow is:

```
User visits yoonos.app
    ↓
Middleware checks for active Supabase session
    ↓ no session              ↓ session exists
/login page renders       Load user data → /desktop renders
    ↓
User signs up or logs in
    ↓
Session created (cookie-based)
    ↓
Redirect to /desktop
```

Sessions are stored in cookies (not localStorage) so they work with Next.js server-side rendering and persist across page refreshes.

---

## Route Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx        # Login + signup tabs
│   └── layout.tsx          # Auth layout: centered card, no desktop chrome
├── (os)/
│   ├── desktop/
│   │   └── page.tsx        # The OS desktop — requires session
│   └── layout.tsx          # OS layout: full screen, loads user data
└── middleware.ts            # Route protection: redirects unauthenticated users
```

The `(auth)` and `(os)` folders use Next.js Route Groups (parentheses = no URL segment). This keeps auth pages and OS pages using different layouts without polluting the URL.

---

## Middleware: Route Protection

This runs on every request. If the user hits any `/desktop` route without a session, they are redirected to `/login`. If they hit `/login` with an active session, they are redirected to `/desktop`.

```typescript
// middleware.ts  (root of the project, same level as app/)
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value; },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // Not logged in and trying to access the desktop
  if (!session && pathname.startsWith('/desktop')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in and hitting login page — send to desktop
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/desktop', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/desktop/:path*', '/login'],
};
```

---

## Login Page Design

**Route:** `/login`  
**File:** `app/(auth)/login/page.tsx`

The login page is the first thing a new user sees. It should look like a macOS-style login screen — clean, minimal, centered.

### Visual Design

- Full-screen dark gradient background (same style as the OS wallpaper).
- A centered white/frosted-glass card, ~380px wide.
- YoonOS logo or wordmark at the top of the card.
- Two tabs: **"Sign In"** and **"Create Account"**.
- Below the tabs: the relevant form.
- A subtle tagline under the logo: "Your AI-native desktop."

### Sign In Form

```
[Email address input]
[Password input]
[Sign In button — full width, dark]
[Error message area — shows if login fails]
```

### Create Account Form

```
[Display name input]      ← Stored in user_profiles.display_name
[Email address input]
[Password input]          ← min 8 characters
[Confirm password input]
[Create Account button — full width, dark]
[Error message area]
```

After successful signup: Supabase automatically calls the `on_auth_user_created` trigger, which creates rows in `user_profiles` and `user_settings`. Then redirect to `/desktop`.

---

## Implementation: Login Page Component

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Tab = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/desktop');
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/desktop');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 w-96 border border-white/20 shadow-2xl">
        <h1 className="text-white text-2xl font-bold text-center mb-1">YoonOS</h1>
        <p className="text-white/50 text-sm text-center mb-6">Your AI-native desktop</p>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-lg p-1 mb-6">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="email" placeholder="Email address" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            <input
              type="password" placeholder="Password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="text" placeholder="Display name" required
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            <input
              type="email" placeholder="Email address" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            <input
              type="password" placeholder="Password (min 8 characters)" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            <input
              type="password" placeholder="Confirm password" required
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

---

## Session Loading on Desktop

When the `/desktop` route loads, pull the user's profile and settings from Supabase before rendering the OS.

```typescript
// app/(os)/desktop/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import DesktopClient from '@/components/os/DesktopClient';

export default async function DesktopPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  // Load user data server-side before rendering
  const [profileResult, settingsResult] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('user_settings').select('*').eq('id', session.user.id).single(),
  ]);

  return (
    <DesktopClient
      userId={session.user.id}
      userEmail={session.user.email!}
      profile={profileResult.data}
      settings={settingsResult.data}
    />
  );
}
```

The `DesktopClient` component (marked `'use client'`) receives the user data as props and hydrates the Zustand stores with it on mount.

---

## Sign Out

Add a sign-out option to the System Settings app and/or the top bar user menu.

```typescript
// In any client component
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const router = useRouter();

const handleSignOut = async () => {
  await supabase.auth.signOut();
  router.push('/login');
  router.refresh();
};
```

---

## Auth Store (Zustand)

Add this store to hold the current user in client-side state so all components can access it without prop drilling.

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { UserProfile, UserSettings } from '@/types';

type AuthStore = {
  userId: string | null;
  userEmail: string | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  setUser: (userId: string, email: string, profile: UserProfile, settings: UserSettings) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  userEmail: null,
  profile: null,
  settings: null,
  setUser: (userId, userEmail, profile, settings) =>
    set({ userId, userEmail, profile, settings }),
  updateSettings: (partial) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
    })),
  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),
  clearUser: () => set({ userId: null, userEmail: null, profile: null, settings: null }),
}));
```

---

## Verification Checklist

- [ ] `/login` renders a login/signup form.
- [ ] Creating an account redirects to `/desktop`.
- [ ] Signing in redirects to `/desktop`.
- [ ] Refreshing the page on `/desktop` does NOT log the user out.
- [ ] Visiting `/desktop` without a session redirects to `/login`.
- [ ] Visiting `/login` while logged in redirects to `/desktop`.
- [ ] Sign out works and redirects to `/login`.
- [ ] New user automatically has rows in `user_profiles` and `user_settings`.
