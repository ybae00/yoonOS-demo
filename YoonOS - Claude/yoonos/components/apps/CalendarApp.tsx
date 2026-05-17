'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { useAuthStore } from '@/stores/authStore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarApp() {
  const { events, selectedDate, setSelectedDate, addEvent, removeEvent, currentMonth, setCurrentMonth } =
    useCalendarStore();
  const userId = useAuthStore((s) => s.userId);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const selectedEvents = selectedDate ? events[selectedDate] || [] : [];

  const handlePrev = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleCreate = () => {
    if (!selectedDate || !newTitle.trim() || !userId) return;
    addEvent(userId, selectedDate, newTitle.trim(), newNotes.trim() || undefined);
    setNewTitle('');
    setNewNotes('');
    setShowCreatePanel(false);
  };

  return (
    <div className="flex h-full bg-white text-black">
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrev} className="p-1 hover:bg-black/5 rounded transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNext} className="p-1 hover:bg-black/5 rounded transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] text-black/40 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px flex-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = formatDate(year, month, day);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const hasEvents = (events[dateStr] || []).length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative flex flex-col items-center justify-center rounded text-xs transition-colors
                  ${isSelected ? 'bg-black text-white ring-1 ring-black' : 'hover:bg-black/5'}
                  ${isToday ? 'font-bold text-black' : 'text-black/70'}`}
              >
                {day}
                {hasEvents && (
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-48 bg-neutral-50 border-l border-black/10 flex flex-col p-3 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-black/60">
            {selectedDate || 'Select a day'}
          </span>
          {selectedDate && (
            <button
              onClick={() => setShowCreatePanel(true)}
              className="p-0.5 hover:bg-black/5 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-black/60" />
            </button>
          )}
        </div>

        {showCreatePanel && selectedDate && (
          <div className="mb-3 space-y-1.5">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Event title"
              className="w-full bg-white border border-black/10 text-black text-xs rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-black placeholder:text-black/30"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-white border border-black/10 text-black text-xs rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-black placeholder:text-black/30 resize-none h-12"
            />
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                className="flex-1 text-xs bg-black hover:bg-black/80 text-white rounded py-1 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowCreatePanel(false);
                  setNewTitle('');
                  setNewNotes('');
                }}
                className="text-xs px-2 hover:bg-black/5 rounded py-1 transition-colors text-black/50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {selectedEvents.length === 0 && !showCreatePanel && (
          <p className="text-[10px] text-black/30 mt-2">No events</p>
        )}

        <div className="space-y-1">
          {selectedEvents.map((event) => (
            <div key={event.id} className="bg-white border border-black/10 rounded p-2 group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs text-black/80">{event.title}</span>
                <button
                  onClick={() => {
                    if (selectedDate && userId) removeEvent(selectedDate, event.id, userId);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <Trash2 className="w-3 h-3 text-black/50" />
                </button>
              </div>
              {event.notes && (
                <p className="text-[10px] text-black/40 mt-0.5">{event.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
