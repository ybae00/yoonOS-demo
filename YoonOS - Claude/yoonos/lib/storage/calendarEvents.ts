import { supabase } from '@/lib/supabase/client';
import { DBCalendarEvent } from '@/types';

export async function loadUserEvents(userId: string): Promise<DBCalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export async function createEvent(
  userId: string,
  date: string,
  title: string,
  notes?: string
): Promise<DBCalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ user_id: userId, date, title, notes: notes || null })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export async function removeEvent(eventId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);
  return !error;
}
