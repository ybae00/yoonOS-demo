import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export async function captureAndStorePhoto(
  canvasElement: HTMLCanvasElement
): Promise<{ storagePath: string; signedUrl: string } | null> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return null;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvasElement.toBlob(resolve, 'image/png')
  );
  if (!blob) return null;

  const photoId = crypto.randomUUID();
  const storagePath = `${userId}/${photoId}.png`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, blob, { contentType: 'image/png' });

  if (uploadError) {
    console.error('Photo upload failed:', uploadError.message);
    return null;
  }

  const { error: dbError } = await supabase
    .from('photos')
    .insert({ user_id: userId, storage_path: storagePath });

  if (dbError) {
    console.error('Photo DB insert failed:', dbError.message);
    return null;
  }

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
