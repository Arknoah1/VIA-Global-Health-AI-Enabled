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
- **Internationalization (i18n)**: Custom React context-based system supporting 4 languages (English, French, Portuguese, Swahili)
  - Translation files: `client/src/i18n/translations.ts` (200+ keys per language)
  - Context provider: `client/src/i18n/LanguageProvider.tsx` with `useTranslation()` hook
  - Language persists in localStorage under key `via-language`
  - All public-facing pages and components use `t("key")` for UI text
  - Product data (names, descriptions, categories) stays in English from the database
  - Admin pages remain English-only
  - AI chat (Amara) responds in the user's selected language via `language` parameter in API calls

**Key Pages**:
- `/` - Homepage with audience-specific content (distributors, providers, NGOs)
- `/catalog` - Public product catalog with search and filtering
- `/about` - Company information page
- `/admin` - Admin dashboard (password-protected) for product management and scraping
- `/admin/quote-requests` - Manage quote requests and generate invoices
- `/admin/pricing` - Configure pricing tiers, country restrictions, customer segments
- `/contact` - Contact Us page with office locations, email, and chat CTA
- `/privacy-policy` - Privacy Policy (exact text from viaglobalhealth.com)
- `/return-policy` - Return Policy (exact text from viaglobalhealth.com)
- `/admin/training` - Training transcript management

### Admin Authentication
- Session-based authentication using `express-session` with PostgreSQL session store (`connect-pg-simple`)
- Password stored in `ADMIN_PASSWORD` secret
- Rate limiting: 5 failed attempts per IP triggers 15-minute lockout
- Secure cookies in production (httpOnly, sameSite: lax, secure flag)
- Login page at `/admin` when not authenticated, logout button in sidebar
- All admin API endpoints protected with `requireAdmin` middleware
- Public endpoints (GET products, quote-request chat) remain open

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
- `POST /api/recommendations` - AI-powered product recommendations based on browsing history (rate-limited per IP)
- `POST /api/quote-requests/start` - Start quote session, accepts optional `customerProfile` for returning customers. Returns `priceText` and `pricingTiers` with Default segment multiplier (1.25x) applied to base prices
- `POST /api/quote-requests/:id/messages` - Chat message handler, returns `profileUpdate` for frontend persistence
- `PATCH /api/quote-requests/:id/status` - Update quote request status (active, in_progress, closed_won, closed_lost); triggers async AI review on close
- `GET /api/sales-insights` - Retrieve all sales insights extracted from closed deals
- `GET /api/quote-requests/:id/ai-review` - Fetch AI review and related insights for a specific quote request
- `GET /api/quote-requests/export/markdown` - Export all quote requests as Markdown with full conversation history
- `GET /api/logistics` - Retrieve all logistics/shipping lookup data
- `POST /api/logistics/import` - Import logistics lookup data (replaces existing)

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `db:push` command

**Main Tables**:
- `products` - Medical equipment and pharmaceutical products with pricing, images, specifications, FAQs, shipping dimensions (length/width/depth cm, weight kg), and pickup country
- `quote_requests` - Customer quote requests with conversation history and AI review (jsonb `ai_review` column)
- `sales_insights` - Actionable lessons extracted from closed deals by AI, fed back into Amara's system prompt
- `logistics_lookup` - Shipping cost reference data by product type, destination, and origin country (72 routes, 135 historical shipments); used by Amara and proforma invoices for shipping estimates. Includes chargeable weight per unit.
- Customer profile persistence via localStorage (`client/src/lib/customerProfile.ts`) - remembers name, email, org type, country, import capability between sessions. Org type is locked once set. "Not you?" button allows profile reset.

### Web Scraping
- **Tool**: Puppeteer with headless Chromium
- **Purpose**: Scrapes product data from viaglobalhealth.com including images, descriptions, specifications
- **Location**: `server/scraper.ts`
- **Data Extraction Strategy**: Two-phase approach:
  1. Primary: JSON-LD structured data (Schema.org Product markup) for reliable name, price, SKU, images, dimensions
  2. Secondary: DOM scraping with selectors for both standard WooCommerce classes AND Divi theme builder (`et_pb_wc_*`) classes
- **Metadata Extraction**: Parses short description bullets for seller name/location, warranty, MOQ, regulatory approval
- **404 Detection**: Skips pages with "not found" / "404" in h1/title or `.error-404` class
- **Document/Certificate Extraction**: Parses Divi's `et_link_options_data` JS variable to map blurb elements to PDF URLs, classifies as documents vs regulatory certificates based on section headings
- **Video Extraction**: Captures all YouTube/Vimeo embeds with titles into `videos` array
- **Local File Storage**: Downloads images to `client/public/images/products/`, documents to `client/public/documents/products/{sku}/`, thumbnails to `client/public/images/products/thumbnails/`
- **Upsert on Re-scrape**: When scraping a product with an existing SKU, updates the existing record instead of failing on duplicate constraint. SKU comparison is case-insensitive and whitespace-trimmed.

### AI Integration
- **Provider**: OpenAI API (via Replit AI integrations)
- **Use Case**: Powers the conversational quote request flow, helping users specify their needs
- **Amara Prompt Strategy**: Lane A Express by Default (Senior Sales Advisor persona)
  - **Stepwise Quote Flow** (ProductDetailSheet): 4-step structured UI before AI chat
    - Step 1 (Intro & Price): Product name, starting price from DB pricing tiers, "Get a Quote" button
    - Step 2 (Quantity): Numeric quantity input with live tier-based pricing calculator, volume discount display
    - Step 3 (Details): Contact form (name, email, shipping country) — skipped for returning customers with saved profile
    - Step 4 (Chat): Full AI conversation with Amara; quantity + contact data sent automatically as first message
  - Progress bar in dialog header reflects current step (1-4)
  - Chat text input hidden during steps 1-3; only visible in step 4
  - Backend returns `priceText` and `pricingTiers` array from `/api/quote-requests/start`
  - AmaraChatDialog (general, no product) retains the original single-step chat flow
  - If customer asks detailed questions, Amara can slow to consultative pace while maintaining momentum
  - Regional Anchor: Provides shipping range across known destinations when specific country not mentioned
  - Organisation type framed as a "discount benefit" ("we offer subsidised rates for NGOs...")
  - Flow: Structured steps (price → quantity → contact) → AI chat (shipping estimate → org type → Combined Order Summary)
  - 2-Strike Rule: If customer ignores org type question twice, defaults to "Standard Healthcare Provider" pricing
  - Organisation type is permanently locked once provided (anti-gaming)
  - Red flag gatekeeper: Detects blocked email domains (16) and suspicious keywords (12), switches to Public Partner Mode
  - Public Partner Mode: Shares specs but refuses pricing, uses "Soft Pivot" and "Directness" escalation
  - Shipping data: 15% safety buffer applied internally, presented to customers as "within 10% accuracy"
  - **Proforma Invoice Shipping Estimation** (4-tier hybrid approach):
    1. Exact product + destination country match from logistics_lookup
    2. Regional average (e.g., East Africa) for same product when no exact country match
    3. All-routes average for the product when destination is outside known regions
    4. Volumetric weight fallback: computes chargeable weight from product dimensions × $/kg rate by origin country (China $10.65, India $19.29, Vietnam $36.14, USA $50.42) when no logistics data exists for the product at all. Also resolves product by name when productId is missing.

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

## 10-Step AI Optimization Plan

This plan outlines the next steps to further optimize the website and leverage AI for achieving VIA Global Health's business goals.

### Phase 1: Quote Automation (Steps 1-3)

**Step 1: AI Quote Generation Engine**
- Build rules engine that automatically calculates quotes based on:
  - Customer type (distributor = 10% markup, NGO = manufacturer direct)
  - Geographic eligibility (block US/Canada/EU for foreign products)
  - Shipping modality (air vs sea based on volume and urgency)
- Integrate with supplier pricing data
- Target: Auto-generate 80% of quotes without human intervention

**Step 2: AI Email Response System**
- Implement AI agent that monitors quote request emails
- Auto-respond to common questions (specs, availability, shipping times)
- Escalate complex requests to human agents
- Integrate with existing email system via API

**Step 3: Quote Follow-up Automation**
- Build automated follow-up sequences triggered by quote status
- AI personalizes follow-up messages based on customer conversation history
- Track engagement and optimize messaging

### Phase 2: Customer Intelligence (Steps 4-6)

**Step 4: Customer Qualification Scoring**
- Develop ML model to score lead quality based on:
  - Organization type and size
  - Order volume history
  - Response patterns
- Prioritize high-value leads for human follow-up

**Step 5: Predictive Inventory Recommendations**
- Analyze customer purchase patterns
- Recommend products based on similar customer behavior
- Cross-sell and upsell suggestions in quote flow

**Step 6: Customer Journey Analytics**
- Track full customer journey from first visit to purchase
- Identify drop-off points in quote funnel
- A/B test messaging and UX improvements

### Phase 3: Communication Optimization (Steps 7-8)

**Step 7: On-Platform Messaging Hub**
- Build unified inbox for all customer communications
- Integrate WhatsApp Business API to capture off-platform chats
- AI summarizes conversation threads for quick context

**Step 8: Multi-language Support**
- Add AI-powered translation for French, Portuguese, Swahili
- Localize product descriptions and quote communications
- Expand market reach across Africa

### Phase 4: Advanced Features (Steps 9-10)

**Step 9: Visual Product Discovery**
- Implement AI image recognition for "find similar products"
- Allow customers to upload images of needed equipment
- Match to catalog with confidence scores

**Step 10: Predictive Analytics Dashboard**
- Build admin dashboard with:
  - Revenue forecasting
  - Customer churn prediction
  - Optimal pricing recommendations
- Real-time KPI tracking for quote conversion rates

### Success Metrics
- Quote-to-sale conversion rate: Target 25% increase
- Average time to quote: Target < 1 hour (from 24 hours)
- Human intervention rate: Target < 20% of quotes
- Customer satisfaction: Track NPS score

### Implementation Priority
1. Steps 1-3 (Quote Automation) - Immediate focus
2. Steps 4-6 (Customer Intelligence) - Q2 2025
3. Steps 7-8 (Communication) - Q3 2025
4. Steps 9-10 (Advanced) - Q4 2025