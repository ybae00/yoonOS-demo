import { redirect } from 'next/navigation';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import DesktopClient from '@/components/os/DesktopClient';

export const dynamic = 'force-dynamic';

export default async function DesktopPage() {
  if (!isSupabaseConfigured) {
    return <DesktopClient userId="" userEmail="" profile={null} settings={null} />;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

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
