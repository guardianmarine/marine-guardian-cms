import { HeroBlock, FeaturedPick, Locale, Unit } from '@/types';
import { mockHeroBlocks } from './mockData';
import { supabase } from '@/lib/supabaseClient';

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

    // Hero block still uses mock data (or could be from site_settings)
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

    if (!supabase) {
      console.warn('Supabase not initialized');
      return [];
    }

    // Fetch latest published units from Supabase as featured picks
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('listed_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Error fetching featured picks:', error);
      return [];
    }

    // Transform units into FeaturedPick format
    const featuredPicks: FeaturedPick[] = (data || []).map((unit: Unit, index: number) => ({
      id: unit.id,
      unit_id: unit.id,
      unit: unit,
      sort: index,
      status: 'published' as const,
    }));
    
    contentCache[cacheKey] = { data: featuredPicks, timestamp: Date.now() };
    return featuredPicks;
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
