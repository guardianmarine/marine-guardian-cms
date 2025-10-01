import { HeroBlock, FeaturedPick, Locale } from '@/types';
import { mockHeroBlocks, mockFeaturedPicks } from './mockData';
import { isUnitPublished } from '@/lib/publishing-utils';

// Simple in-memory cache
let contentCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class ContentService {
  static clearCache() {
    contentCache = {};
  }

  static async getHeroBlock(lang: Locale = 'en'): Promise<HeroBlock | null> {
    const cacheKey = `hero_${lang}`;
    const cached = contentCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    const data = mockHeroBlocks[lang] || mockHeroBlocks.en;
    
    contentCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }

  static async getFeaturedPicks(lang: Locale = 'en'): Promise<FeaturedPick[]> {
    const cacheKey = `featured_${lang}`;
    const cached = contentCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    // Use flexible publishing logic for both featured picks and their units
    const data = mockFeaturedPicks.filter(
      (pick) => pick.status === 'published' && pick.unit && isUnitPublished(pick.unit)
    );
    
    contentCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }

  static async getHomeContent(lang: Locale = 'en') {
    const cacheKey = `home_${lang}`;
    const cached = contentCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const [hero, featuredPicks] = await Promise.all([
      this.getHeroBlock(lang),
      this.getFeaturedPicks(lang),
    ]);

    const data = {
      hero,
      featuredPicks,
      carousels: [],
      promotions: [],
      sections: [],
    };
    
    contentCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }
}
