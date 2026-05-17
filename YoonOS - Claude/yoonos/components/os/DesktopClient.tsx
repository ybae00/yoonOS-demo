'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTextEditStore } from '@/stores/textEditStore';
import { useCalendarStore } from '@/stores/calendarStore';
import AICanvas from './AICanvas';
import type { UserProfile, UserSettings } from '@/types';

type Props = {
  userId: string;
  userEmail: string;
  profile: UserProfile | null;
  settings: UserSettings | null;
};

export default function DesktopClient({ userId, userEmail, profile, settings }: Props) {
  useEffect(() => {
    if (profile && settings && userId) {
      useAuthStore.getState().setUser(userId, userEmail, profile, settings);
      useTextEditStore.getState().loadFiles(userId);
      useCalendarStore.getState().loadEvents(userId);
    } else {
      useTextEditStore.getState().initLocal();
    }
  }, [userId, userEmail, profile, settings]);

  return <AICanvas />;
}
