import { supabase } from '@/lib/supabase/client';
import { DBFile } from '@/types';

export async function loadUserFiles(userId: string): Promise<DBFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export async function saveFile(
  fileId: string | null,
  userId: string,
  name: string,
  content: string
): Promise<DBFile | null> {
  if (fileId) {
    const { data, error } = await supabase
      .from('files')
      .update({ name, content })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from('files')
      .insert({ user_id: userId, name, content })
      .select()
      .single();
    if (error) {
      console.error(error);
      return null;
    }
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
