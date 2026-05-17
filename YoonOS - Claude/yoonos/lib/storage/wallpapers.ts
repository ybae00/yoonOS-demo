import { supabase } from '@/lib/supabase/client';

export async function uploadWallpaper(
  userId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const storagePath = `${userId}/wallpaper.${ext}`;

  const { error } = await supabase.storage
    .from('wallpapers')
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error(error);
    return null;
  }

  const { data } = await supabase.storage
    .from('wallpapers')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  return data?.signedUrl ?? null;
}

export async function getWallpaperUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('wallpapers')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  return data?.signedUrl ?? null;
}
