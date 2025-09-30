import { create } from 'zustand';
import { HeroBlock, Carousel, Promotion, FeaturedPick, MediaAsset, Locale } from '@/types';
import { mockHeroBlocks, mockFeaturedPicks } from './mockData';

interface ContentStore {
  heroBlocks: Record<Locale, HeroBlock>;
  carousels: Carousel[];
  promotions: Promotion[];
  featuredPicks: FeaturedPick[];
  mediaAssets: MediaAsset[];
  updateHeroBlock: (locale: Locale, data: Partial<HeroBlock>) => void;
  publishHeroBlock: (locale: Locale) => void;
  updateFeaturedPicks: (picks: FeaturedPick[]) => void;
  addMediaAsset: (asset: MediaAsset) => void;
  updateMediaAsset: (id: string, data: Partial<MediaAsset>) => void;
  deleteMediaAsset: (id: string) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  heroBlocks: mockHeroBlocks,
  carousels: [],
  promotions: [],
  featuredPicks: mockFeaturedPicks,
  mediaAssets: [],

  updateHeroBlock: (locale, data) =>
    set((state) => ({
      heroBlocks: {
        ...state.heroBlocks,
        [locale]: { ...state.heroBlocks[locale], ...data, updated_at: new Date().toISOString() },
      },
    })),

  publishHeroBlock: (locale) =>
    set((state) => ({
      heroBlocks: {
        ...state.heroBlocks,
        [locale]: {
          ...state.heroBlocks[locale],
          status: 'published',
          version: state.heroBlocks[locale].version + 1,
          updated_at: new Date().toISOString(),
        },
      },
    })),

  updateFeaturedPicks: (picks) => set({ featuredPicks: picks }),

  addMediaAsset: (asset) =>
    set((state) => ({
      mediaAssets: [...state.mediaAssets, asset],
    })),

  updateMediaAsset: (id, data) =>
    set((state) => ({
      mediaAssets: state.mediaAssets.map((asset) =>
        asset.id === id ? { ...asset, ...data, updated_at: new Date().toISOString() } : asset
      ),
    })),

  deleteMediaAsset: (id) =>
    set((state) => ({
      mediaAssets: state.mediaAssets.filter((asset) => asset.id !== id),
    })),
}));
