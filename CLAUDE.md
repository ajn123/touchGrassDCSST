# CLAUDE.md

## Project Overview

TouchGrass DC — serverless event aggregation for Washington, DC. Crawls event sources, normalizes via Step Functions, stores in DynamoDB. Frontend is Next.js deployed via SST.

## Commands

**Node 22 required** (not 23). Use `PATH="/opt/homebrew/opt/node@22/bin:/usr/local/bin:$PATH"` before SST commands.

```bash
npx sst dev                          # Local dev
npx sst deploy --stage production    # Production deploy
npx sst test                         # Vitest

# Crawlers
npm run crawl:dcimprov:prod          # Production DC Improv
npm run crawl:dccomedyloft:prod      # Production Comedy Loft

# Group seeding (from project root)
npx sst shell --stage production tsx packages/scripts/src/seed-groups.ts
```

## Architecture

**Monorepo** (npm workspaces):
- `packages/frontend` — Next.js 15 / React 19 (Tailwind CSS)
- `packages/functions` — Lambda handlers (Hono)
- `packages/tasks` — ECS Fargate crawlers (Playwright/Cheerio)
- `packages/scripts` — DB seeding, migrations
- `packages/shared-utils` — Shared utilities (`@touchgrass/shared-utils`)
- `packages/auth` — OpenAuth email auth
- `packages/user_analytics` — SQS user tracking

**Infra** (`infra/`): `db.ts`, `api.ts`, `web.ts`, `tasks.ts`, `cron.ts`, `step_functions.ts`, `storage.ts`, `email.ts`, `auth.ts`, `queue.ts`

## Data Flow

Crawlers → Step Functions (normalize) → DynamoDB → Next.js frontend (via API Gateway)

## DynamoDB Schema

Single-table, composite keys: `pk` (e.g. `EVENT#uuid`, `GROUP#title`), `sk` for relationships.
GSIs: `createdAtIndex`, `eventCategoryIndex`, `publicEventsIndex`, `eventTitleIndex`, `groupScheduleIndex`

## Crawlers

**Adding a new crawler**:
1. Add `transformXxxEvent` in `packages/functions/src/events/normalizeEvents.ts` — map `date`→`start_date`, `time`→`start_time`
2. Add `case "xxx":` in the `normalizeEvents` switch
3. Without a matching case, dates are silently dropped

## Card Components

**`EventCard.tsx`** — unified card used across all pages (events, groups, quiz results). Features:
- Category-specific accent colors via `CATEGORY_ACCENT` map (25+ categories)
- Colored top border, date in accent color, optional badge/tags
- Props: `href`, `title`, `imageUrl`, `category`, `venue`, `date`, `description`, `badge`, `tags`, `children`
- Wrapper components: `FeaturedEvent` (events), `FeaturedGroup` (groups) delegate to `EventCard`

## Image Handling

`packages/frontend/src/lib/image-utils.ts`:
- `resolveImageUrl(image_url, category, title, venue)` — returns URL or generates SVG data URI placeholder
- SVG placeholders have category-specific gradients, title text, category badge (white text on dark+accent bg), venue
- `shouldBeUnoptimized(url)` — true for external URLs and `data:` URIs
- Daily cron (`generateMissingImagesCron`) backfills S3 SVG placeholders

## Groups

`groups.json` → seeded via `seed-groups.ts`. DynamoDB: `GROUP#<title>` + `GROUP_INFO` / `SCHEDULE#` items.

**Quality rules**: No Google thumbnails, no Meetup placeholders, clean social URLs, documented categories only.

**Categories**: Running, Sports, Social, Outdoors, Hiking, Cycling, Dating, LGBTQ+, Dance, Photography, Arts, Book Club, Board Games, Climbing, Fitness, Yoga, Education, Trivia, Volunteer

## SEO

- `generateMetadata()` on dynamic pages, `export const metadata` on static pages
- JSON-LD: `WebSite`, `Event`, `Organization`, `Article` schemas
- `sitemap.ts`, `robots.ts`, `public/llms.txt`

## Analytics

- `tg_vid` cookie (middleware) → SQS → DynamoDB (`ANALYTICS#USER_VISIT`, `sk: TIME#<ms>`)
- Daily report email at 8 AM EST via Lambda cron
- Admin dashboard at `/admin`

## Deployment

**Production checklist**:
1. `npx sst deploy --stage production` (Node 22, include `/usr/local/bin` in PATH for Docker credentials)
2. If groups.json changed: run seed script
3. Renaming a group requires manual DynamoDB cleanup

**Common issues**:
- `resource.enc: no such file` → Use Node 22
- Docker credential error → Ensure `/usr/local/bin` is in PATH
- SST version must be 3.17.23

**Pi** at `pi@10.0.0.74` (`~/TouchGrassDCSST`) has AWS creds for deploys.

## Conventions

- TypeScript, ES modules, Valibot (not Zod)
- Frontend alias: `@/*` → `packages/frontend/src/*`
- Server components querying DynamoDB need `export const dynamic = "force-dynamic"; export const revalidate = 0;`
- Crawlers: validate titles + future dates, max 50 events per run, auto-batch >256KB payloads
- Admin emails: `packages/frontend/src/lib/admin-utils.ts`
