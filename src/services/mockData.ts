import { Unit, Location, User, HeroBlock, FeaturedPick, Locale } from '@/types';

export const mockLocation: Location = {
  id: '1',
  name: 'Guardian Marine - Red Oak',
  address: 'Red Oak, TX',
  phone: '214-613-8521',
};

export const mockUser: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@guardianmarine.com',
  role: 'admin',
  commission_percent: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: 'user-2',
    name: 'John Sales',
    email: 'john@guardianmarine.com',
    role: 'sales',
    commission_percent: 3.0, // 3% commission
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-3',
    name: 'Maria Lopez',
    email: 'maria@guardianmarine.com',
    role: 'sales',
    commission_percent: 2.5, // 2.5% commission
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-4',
    name: 'Finance Manager',
    email: 'finance@guardianmarine.com',
    role: 'finance',
    commission_percent: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockUnits: Unit[] = [];

export const mockHeroBlocks: Record<Locale, HeroBlock> = {
  en: {
    id: '1',
    locale: 'en',
    title: 'Heavy-Duty Solutions for Your Business',
    subtitle: 'Quality trucks, trailers, and equipment at competitive prices',
    bg_media_id: '1',
    overlay_rgba: 'rgba(0, 0, 0, 0.4)',
    show_search: true,
    search_tab: 'truck',
    primary_cta_label: 'Search Inventory',
    primary_cta_url: '/inventory',
    secondary_cta_label: 'Request a Unit',
    secondary_cta_url: '/request',
    status: 'published',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  es: {
    id: '2',
    locale: 'es',
    title: 'Soluciones de Trabajo Pesado para Su Negocio',
    subtitle: 'Camiones, remolques y equipo de calidad a precios competitivos',
    bg_media_id: '1',
    overlay_rgba: 'rgba(0, 0, 0, 0.4)',
    show_search: true,
    search_tab: 'truck',
    primary_cta_label: 'Buscar Inventario',
    primary_cta_url: '/inventory',
    secondary_cta_label: 'Solicitar una Unidad',
    secondary_cta_url: '/request',
    status: 'published',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const mockFeaturedPicks: FeaturedPick[] = [];
