'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Tab = 'signin' | 'signup';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.startsWith('your-');

function getSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGuest = () => {
    router.push('/desktop');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Use "Continue as Guest" or add your Supabase credentials to .env.local.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/desktop');
        router.refresh();
      }
    } catch {
      setError('Could not connect to auth service. Check your Supabase configuration.');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Use "Continue as Guest" or add your Supabase credentials to .env.local.');
      return;
    }
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
    try {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        setError(error.message);
      } else {
        router.push('/desktop');
        router.refresh();
      }
    } catch {
      setError('Could not connect to auth service. Check your Supabase configuration.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-neutral-50 to-neutral-200 flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 w-96 border border-black/10 shadow-2xl">
        <h1 className="text-black text-2xl font-bold text-center mb-1">YoonOS</h1>
        <p className="text-black/50 text-sm text-center mb-6">Your AI-native desktop</p>

        {!isSupabaseConfigured && (
          <button
            onClick={handleGuest}
            className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-black/80 transition-colors mb-4"
          >
            Continue as Guest
          </button>
        )}

        <div className="flex bg-neutral-100 rounded-lg p-1 mb-6">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            {error && <p className="text-black text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="text"
              placeholder="Display name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            <input
              type="password"
              placeholder="Confirm password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white border border-black/15 rounded-lg px-4 py-3 text-black placeholder-black/35 focus:outline-none focus:border-black"
            />
            {error && <p className="text-black text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {!isSupabaseConfigured && (
          <p className="text-black/35 text-[10px] text-center mt-4">
            Supabase not configured. Add credentials to .env.local to enable accounts.
          </p>
        )}
      </div>
    </div>
  );
}
