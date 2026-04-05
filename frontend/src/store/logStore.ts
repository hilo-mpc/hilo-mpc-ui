import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source?: string;   // e.g. node label or run type
  message: string;
}

interface LogState {
  entries: LogEntry[];
  isOpen: boolean;
  log: (level: LogLevel, message: string, source?: string) => void;
  clear: () => void;
  toggle: () => void;
  open: () => void;
}

let _counter = 0;

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  isOpen: false,

  log: (level, message, source) =>
    set((s) => ({
      entries: [
        ...s.entries,
        { id: String(++_counter), timestamp: new Date(), level, message, source },
      ],
      // Auto-open terminal on warnings/errors
      isOpen: level === 'error' || level === 'warn' ? true : s.isOpen,
    })),

  clear: () => set({ entries: [] }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
}));
