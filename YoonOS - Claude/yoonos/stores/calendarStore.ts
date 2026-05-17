import { create } from 'zustand';
import { DBCalendarEvent } from '@/types';
import {
  loadUserEvents,
  createEvent,
  removeEvent as removeEventDB,
} from '@/lib/storage/calendarEvents';

type CalendarStore = {
  events: Record<string, DBCalendarEvent[]>;
  selectedDate: string | null;
  currentMonth: Date;
  isLoading: boolean;
  loadEvents: (userId: string) => Promise<void>;
  addEvent: (userId: string, date: string, title: string, notes?: string) => Promise<void>;
  removeEvent: (date: string, eventId: string, userId: string) => Promise<void>;
  getEventsForDate: (date: string) => DBCalendarEvent[];
  setSelectedDate: (date: string | null) => void;
  setCurrentMonth: (date: Date) => void;
};

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: {},
  selectedDate: null,
  currentMonth: new Date(),
  isLoading: false,

  loadEvents: async (userId) => {
    set({ isLoading: true });
    const allEvents = await loadUserEvents(userId);
    const grouped: Record<string, DBCalendarEvent[]> = {};
    for (const ev of allEvents) {
      if (!grouped[ev.date]) grouped[ev.date] = [];
      grouped[ev.date].push(ev);
    }
    set({ events: grouped, isLoading: false });
  },

  addEvent: async (userId, date, title, notes) => {
    const saved = await createEvent(userId, date, title, notes);
    if (saved) {
      set((state) => ({
        events: {
          ...state.events,
          [date]: [...(state.events[date] || []), saved],
        },
      }));
    }
  },

  removeEvent: async (date, eventId, userId) => {
    const ok = await removeEventDB(eventId, userId);
    if (ok) {
      set((state) => ({
        events: {
          ...state.events,
          [date]: (state.events[date] || []).filter((e) => e.id !== eventId),
        },
      }));
    }
  },

  getEventsForDate: (date) => get().events[date] || [],

  setSelectedDate: (date) => set({ selectedDate: date }),

  setCurrentMonth: (date) => set({ currentMonth: date }),
}));
