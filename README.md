# Guardian Marine - Heavy Transport Dealership Platform

**URL**: https://lovable.dev/projects/5e4235bc-d159-45bd-b813-f63f85d081d8

A modern, bilingual (EN/ES) web application for Guardian Marine dealership.

## Phase 1 - Complete ✅

### Public Website
- **Home**: Hero with search, Featured Picks (XL cards when < 4 items), Categories, Request Unit CTA
- **Inventory**: Grid with filters, search params integration, empty states
- **Unit Detail**: Gallery, specs, similar units, contact CTAs
- **Sell/Trade**: Simple inquiry form

### Backoffice CMS
- **Dashboard**: Inventory stats overview
- **Home Editor**: Hero blocks (EN/ES), Featured Picks drag-and-drop
- **Media Library**: Upload, edit alt text (EN/ES), delete
- **Inventory Admin**: View units (full CRUD in Phase 2)
- **Authentication**: Role-based access, protected routes

### Features
- ✅ Bilingual EN/ES with i18n
- ✅ XL cards for small inventory (< 4 featured)
- ✅ Categories hidden when zero stock
- ✅ Hours field internal-only (never public)
- ✅ Content cache (5-min TTL)
- ✅ Responsive, accessible design
- ✅ Modern white/blue design system

## Demo Login
- Email: `admin@guardianmarine.com`
- Password: `admin123`

## Tech Stack
React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, react-i18next, Zustand, dnd-kit

## Development

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

Deploy: Open [Lovable](https://lovable.dev/projects/5e4235bc-d159-45bd-b813-f63f85d081d8) → Share → Publish
