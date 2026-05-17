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
