import { supabase } from '@/lib/supabase/client';

export type UserFileObject = {
  id: string;
  userId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export async function uploadUserFile(
  userId: string,
  file: File
): Promise<UserFileObject | null> {
  const fileId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `${userId}/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('user-files')
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    console.error('User file upload failed:', uploadError.message);
    return null;
  }

  const { data, error: dbError } = await supabase
    .from('user_file_objects')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    console.error('User file metadata insert failed:', dbError.message);
    await supabase.storage.from('user-files').remove([storagePath]);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    storagePath: data.storage_path,
    fileName: data.file_name,
    mimeType: data.mime_type,
    size: data.size,
    createdAt: data.created_at,
  };
}

export async function listUserFiles(userId: string): Promise<UserFileObject[]> {
  const { data, error } = await supabase
    .from('user_file_objects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('List user files failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
  }));
}

export async function deleteUserFile(fileId: string, userId: string): Promise<boolean> {
  const { data: file } = await supabase
    .from('user_file_objects')
    .select('storage_path')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();

  if (!file) return false;

  const { error: storageError } = await supabase.storage
    .from('user-files')
    .remove([file.storage_path]);

  if (storageError) {
    console.error('Delete storage object failed:', storageError.message);
  }

  const { error: dbError } = await supabase
    .from('user_file_objects')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId);

  return !dbError;
}

export async function getUserFileUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('user-files')
    .createSignedUrl(storagePath, 3600);

  return data?.signedUrl ?? null;
}
