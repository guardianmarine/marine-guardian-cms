import { create } from 'zustand';

export type AnnouncementPriority = 'info' | 'warning' | 'urgent';
export type AnnouncementAudience = 'all' | 'employees' | 'admin' | 'sales' | 'inventory' | 'finance' | 'viewer';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience[];
  media_url?: string;
  start_at?: string;
  end_at?: string;
  status: 'draft' | 'published';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementsStore {
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => Announcement;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  getActiveAnnouncements: () => Announcement[];
}

// Mock announcements
const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Company Holiday - Christmas',
    body: 'Office will be closed on December 25th for Christmas. Happy Holidays!',
    priority: 'info',
    audience: ['all'],
    start_at: new Date('2025-12-20').toISOString(),
    end_at: new Date('2025-12-26').toISOString(),
    status: 'published',
    created_by: 'user-1',
    created_at: new Date('2025-12-15').toISOString(),
    updated_at: new Date('2025-12-15').toISOString(),
  },
  {
    id: 'ann-2',
    title: 'New Inventory Management System',
    body: 'We are rolling out a new inventory management feature. Check the training materials in your email.',
    priority: 'warning',
    audience: ['inventory', 'admin'],
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useAnnouncementsStore = create<AnnouncementsStore>((set, get) => ({
  announcements: mockAnnouncements,

  addAnnouncement: (announcementData) => {
    const announcement: Announcement = {
      ...announcementData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ announcements: [...state.announcements, announcement] }));
    return announcement;
  },

  updateAnnouncement: (id, updates) => {
    set((state) => ({
      announcements: state.announcements.map((a) =>
        a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
      ),
    }));
  },

  deleteAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));
  },

  getActiveAnnouncements: () => {
    const now = new Date();
    return get().announcements.filter((a) => {
      if (a.status !== 'published') return false;
      const startAt = a.start_at ? new Date(a.start_at) : null;
      const endAt = a.end_at ? new Date(a.end_at) : null;
      
      if (startAt && now < startAt) return false;
      if (endAt && now > endAt) return false;
      
      return true;
    });
  },
}));
