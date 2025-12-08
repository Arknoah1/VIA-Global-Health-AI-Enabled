# VIA Global Health - Medical Equipment Catalog

## Overview

This is a full-stack web application for VIA Global Health, a medical equipment and pharmaceutical supplier serving distributors, healthcare providers, and NGOs across Africa. The application features a public product catalog, product scraping capabilities from the VIA Global Health website, quote request system with AI-powered chat, and an admin dashboard for managing products.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration

**Key Pages**:
- `/` - Homepage with audience-specific content (distributors, providers, NGOs)
- `/catalog` - Public product catalog with search and filtering
- `/about` - Company information page
- `/admin` - Admin dashboard for product management and scraping

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API under `/api/*` prefix

**Key Endpoints**:
- `GET /api/products` - List all products (with optional search)
- `GET /api/products/:id` - Get single product
- `POST /api/scrape` - Trigger product scraping from VIA Global Health website
- `POST /api/quote-requests` - Submit quote requests
- `POST /api/chat` - AI-powered chat for quote assistance

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `db:push` command

**Main Tables**:
- `products` - Medical equipment and pharmaceutical products with pricing, images, specifications, FAQs
- `quote_requests` - Customer quote requests with conversation history

### Web Scraping
- **Tool**: Puppeteer with headless Chromium
- **Purpose**: Scrapes product data from viaglobalhealth.com including images, descriptions, specifications
- **Location**: `server/scraper.ts`

### AI Integration
- **Provider**: OpenAI API (via Replit AI integrations)
- **Use Case**: Powers the conversational quote request flow, helping users specify their needs

### Build System
- **Client**: Vite builds to `dist/public`
- **Server**: esbuild bundles to `dist/index.cjs`
- **Development**: Vite dev server with HMR proxied through Express

## External Dependencies

### Database
- PostgreSQL database (required, connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database queries
- `connect-pg-simple` for session storage

### AI Services
- OpenAI API for chat functionality
- Configured via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`

### Web Scraping
- Puppeteer for browser automation
- Chromium browser (Nix package path configured for Replit environment)

### UI Components
- shadcn/ui component library built on Radix UI primitives
- Lucide React for icons
- Tailwind CSS for styling

### Key NPM Packages
- `@tanstack/react-query` - Data fetching and caching
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `wouter` - Client-side routing
- `zod` - Runtime type validation
- `puppeteer` - Web scraping