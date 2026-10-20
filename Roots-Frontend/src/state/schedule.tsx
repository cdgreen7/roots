import { createContext, ReactNode, useContext, useState } from 'react';

export type WateringSchedule = {
  id: string;
  at: Date;
};

type ScheduleContextValue = {
  schedules: WateringSchedule[];
  addSchedule: (at: Date) => void;
  removeSchedule: (id: string) => void;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

// Shared between the Schedule tab (which edits it) and Home (which shows the
// next watering). In-memory only until the backend's watering_schedules API exists.
export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<WateringSchedule[]>([]);

  const addSchedule = (at: Date) => {
    setSchedules((current) =>
      [...current, { id: `${at.getTime()}-${Math.random()}`, at }].sort(
        (a, b) => a.at.getTime() - b.at.getTime()
      )
    );
  };

  const removeSchedule = (id: string) => {
    setSchedules((current) => current.filter((s) => s.id !== id));
  };

  return (
    <ScheduleContext.Provider value={{ schedules, addSchedule, removeSchedule }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedules() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedules must be used within a ScheduleProvider');
  return ctx;
}

// Parses times like "8:00 AM", "8am", "14:30". Returns [hours, minutes] or null.
export function parseTime(input: string): [number, number] | null {
  const match = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.[0].toLowerCase();
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'p' && hours !== 12) hours += 12;
    if (meridiem === 'a' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return [hours, minutes];
}

export function formatSchedule(at: Date) {
  const date = at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} — ${time}`;
}
