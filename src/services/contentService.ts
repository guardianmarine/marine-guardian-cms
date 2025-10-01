import { HeroBlock, FeaturedPick, Locale } from '@/types';
import { supabase } from '@/integrations/supabase/client';
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

    // Try to fetch from Supabase hero_blocks table if it exists
    const { data } = await supabase
      .from('hero_blocks')
      .select('*')
      .eq('language', lang)
      .eq('status', 'published')
      .maybeSingle();

    // Fallback to default content if no data
    const heroData = data || {
      title: lang === 'es' ? 'Encuentra tu unidad ideal' : 'Find Your Perfect Unit',
      subtitle: lang === 'es' 
        ? 'Tractores, remolques y equipo de calidad en Dallas-Fort Worth'
        : 'Quality Trucks, Trailers & Equipment in Dallas-Fort Worth',
      cta_text: lang === 'es' ? 'Ver Inventario' : 'View Inventory',
      cta_link: '/inventory',
      background_image: null,
    };
    
    contentCache[cacheKey] = { data: heroData, timestamp: Date.now() };
    return heroData;
  }

  static async getFeaturedPicks(lang: Locale = 'en'): Promise<FeaturedPick[]> {
    const cacheKey = `featured_${lang}`;
    const cached = contentCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch newest published units as featured
    const { data: units } = await supabase
      .from('units')
      .select(`
        id, slug, category, make, model, year, mileage, display_price, 
        main_photo_url, photos, status, published_at, type, location
      `)
      .not('published_at', 'is', null)
      .in('status', ['available', 'reserved'])
      .order('published_at', { ascending: false })
      .limit(12);

    // Transform units to FeaturedPick format
    const data = (units || [])
      .filter((unit) => isUnitPublished(unit))
      .map((unit, index) => ({
        id: unit.id,
        unit_id: unit.id,
        title: `${unit.year} ${unit.make} ${unit.model}`,
        description: unit.type || '',
        status: 'published' as const,
        language: lang,
        sort: index,
        unit: unit as any, // Defensive cast - DB may have different schema
      }));
    
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
