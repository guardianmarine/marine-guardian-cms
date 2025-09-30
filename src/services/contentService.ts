import { HeroBlock, FeaturedPick, Locale } from '@/types';
import { mockHeroBlocks, mockFeaturedPicks } from './mockData';

export class ContentService {
  static async getHeroBlock(lang: Locale = 'en'): Promise<HeroBlock | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockHeroBlocks[lang] || mockHeroBlocks.en;
  }

  static async getFeaturedPicks(lang: Locale = 'en'): Promise<FeaturedPick[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Filter to only show published units
    return mockFeaturedPicks.filter(
      (pick) => pick.status === 'published' && pick.unit?.status === 'published'
    );
  }

  static async getHomeContent(lang: Locale = 'en') {
    const [hero, featuredPicks] = await Promise.all([
      this.getHeroBlock(lang),
      this.getFeaturedPicks(lang),
    ]);

    return {
      hero,
      featuredPicks,
      carousels: [],
      promotions: [],
      sections: [],
    };
  }
}
