# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TouchGrass DC is a serverless event aggregation platform for Washington, DC. It crawls event sources (comedy clubs, Eventbrite, Washingtonian, etc.), normalizes them via Step Functions, and stores them in DynamoDB. The frontend is a Next.js app deployed via SST.

## Commands

```bash
# Development
npx sst dev              # Start local dev with SST
npx sst build            # Build with SST
npx sst deploy           # Deploy to AWS (default stage)
npx sst test             # Run tests via sst test (Vitest)
npx sst console          # Open SST Console
npx sst diff             # Preview deployment changes

# Crawlers (local execution via sst shell)
npm run crawl:dcimprov              # Dev stage
npm run crawl:dcimprov:prod         # Production stage
npm run crawl:dccomedyloft          # Dev stage
npm run crawl:dccomedyloft:prod     # Production stage

# Database
npm run script:seed      # Seed database with sample data
```

Scripts in `packages/scripts/` can be run with: `sst run packages/scripts/src/<script>.ts`

## Architecture

**Monorepo** using npm workspaces with these packages:

| Package | Purpose |
|---------|---------|
| `packages/frontend` | Next.js 15 / React 19 app (Tailwind CSS) |
| `packages/functions` | Lambda handlers (Hono framework for API Gateway) |
| `packages/tasks` | ECS Fargate crawler containers (Playwright/Cheerio) |
| `packages/scripts` | DB seeding, migrations, data management utilities |
| `packages/shared-utils` | Shared TypeScript utilities (`@touchgrass/shared-utils`) |
| `packages/auth` | OpenAuth email-based authentication |
| `packages/user_analytics` | SQS-backed user action tracking |

**Infrastructure** is defined in `infra/` and orchestrated via `sst.config.ts`:
- `db.ts` — DynamoDB single-table design
- `api.ts` — API Gateway V2 routes → Lambda
- `web.ts` — Next.js deployment
- `tasks.ts` — ECS Fargate task definitions for crawlers
- `cron.ts` — EventBridge schedules (crawlers run every 7 days)
- `step_functions.ts` — Event normalization pipeline
- `storage.ts` — S3 bucket
- `email.ts` / `auth.ts` — SES + OpenAuth
- `queue.ts` — SQS for analytics

## Data Flow

1. **Crawlers** (ECS tasks or local via `sst shell`) scrape event sources
2. Events are sent to **Step Functions** for normalization and validation
3. Normalized events are saved to **DynamoDB**
4. **Next.js frontend** fetches events from the API Gateway with field projection support

## DynamoDB Schema

Single-table design with composite keys:
- **pk**: Entity prefix + ID (e.g., `EVENT#uuid`, `GROUP#uuid`, `USER#uuid`)
- **sk**: Sort key for relationships

Five GSIs: `createdAtIndex`, `eventCategoryIndex`, `publicEventsIndex`, `eventTitleIndex`, `groupScheduleIndex`

## Key API Routes

**API Gateway** (Lambda/Hono): `GET|POST /events`, `GET|PUT|DELETE /events/{id}`, `POST /crawler/openwebninja`

**Next.js API routes** (`packages/frontend/src/app/api/`): Crawler triggers, S3 presigned URLs, statistics/analytics, health check, recommendations

## Recommendation System

Client-side personalization using localStorage signals — no auth required.

**Data collection** (`packages/frontend/src/lib/userPreferences.ts`):
- `addToClickHistory(eventId, category)` — called on every event detail page view via `EventPageTracker`; stores up to 50 entries in `localStorage["touchgrass_click_history"]`
- `setCategoryPreferences(categories)` — stores explicit category preferences in `localStorage["touchgrass_category_prefs"]`

**Signal recording** (`packages/frontend/src/components/EventPageTracker.tsx`):
- Client component rendered on every `/events/[id]` page
- Fires `addToClickHistory` in a `useEffect` with the event's `pk` and primary category

**API** (`packages/frontend/src/app/api/recommendations/route.ts` — Next.js, queries DynamoDB directly):
- **With signals**: queries `eventCategoryIndex` GSI per category, deduplicates, scores by preference match (+3), click similarity (+2), recency (+1), and penalizes already-viewed events (-1)
- **No signals (new user)**: falls back to `getCurrentAndFutureEvents()` sorted by date

**Component** (`packages/frontend/src/components/PersonalizedEvents.tsx`):
- Always fetches on mount — no early-return gate
- Shows **"Upcoming Events"** for new users; **"Recommended for You" + Personalized badge** once signals exist
- Renders nothing only if the API returns zero events

## SST Stages

- Default stage is `dev`; production uses `--stage production`
- Production resources are protected and retained on removal
- Dev resources are cleaned up on removal
- Crawlers have separate `:prod` npm scripts that pass `--stage production` to `sst shell`

## Environment Variables

See `.env.example`. Key vars: `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `AWS_REGION`, `DB_NAME`. SST-managed secrets include `OPENWEBNINJA_API_KEY`.

## Image Handling

`packages/frontend/src/lib/image-utils.ts` — `resolveImageUrl(image_url, category, title, venue)`:
- If `image_url` is set, returns it directly (http/https) or resolves from `/images/` (static)
- If missing, generates a **seeded picsum URL** (`https://picsum.photos/seed/{title}/400/300`) so each event gets a unique but consistent placeholder image
- `shouldBeUnoptimized(url)` returns true for external URLs (used to bypass Next.js image optimization)

A daily Lambda cron (`generateMissingImagesCron`) also backfills real SVG placeholder images to S3 for any events without `image_url`, using `generateStyledEventSvgBuffer` from `@touchgrass/shared-utils`.

## Conventions

- TypeScript throughout; ES modules (`"type": "module"` in functions package)
- Validation via Valibot (not Zod)
- Frontend path alias: `@/*` maps to `packages/frontend/src/*`
- Crawlers validate events have titles and future dates before saving; output is limited to 50 events per run
- Payloads exceeding 256KB are automatically batched before sending to Step Functions
