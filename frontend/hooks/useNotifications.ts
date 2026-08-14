import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (title: string, description?: string) => void;
}

export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (title, description) =>
    set((state) => ({
      notifications: [
        {
          id: Math.random().toString(36).substring(7),
          title,
          description,
          timestamp: new Date(),
        },
        ...state.notifications,
      ].slice(0, 50), // Keep last 50
    })),
}));
