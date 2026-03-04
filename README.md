# TouchGrass DC

A serverless event aggregation platform for Washington, DC. Crawls event sources (comedy clubs, Eventbrite, Washingtonian, Kennedy Center, Smithsonian, etc.), normalizes them via Step Functions, and serves them through a Next.js frontend — all deployed via [SST](https://sst.dev).

**Live site**: [touchgrassdc.com](https://touchgrassdc.com)

## Architecture

**Monorepo** using npm workspaces:

| Package | Purpose |
|---------|---------|
| `packages/frontend` | Next.js 15 / React 19 app (Tailwind CSS) |
| `packages/functions` | Lambda handlers (Hono API, analytics, newsletters, articles) |
| `packages/tasks` | ECS Fargate crawler containers (Playwright/Cheerio) |
| `packages/scripts` | DB seeding, migrations, data management utilities |
| `packages/shared-utils` | Shared TypeScript utilities (`@touchgrass/shared-utils`) |
| `packages/auth` | OpenAuth email-based authentication |
| `packages/user_analytics` | SQS-backed user action tracking |

**Infrastructure** (`infra/`): DynamoDB single-table, API Gateway V2, S3, SES, SQS, ECS Fargate, Step Functions, EventBridge crons.

## Features

- **Event aggregation** — automated crawlers for 8+ DC event sources with Step Function normalization pipeline
- **Personalized recommendations** — client-side signals (click history, category preferences) with category-diverse round-robin ranking
- **Interactive map** — Google Maps integration showing all events with location data
- **Search** — full-text event search with field projection for efficient queries
- **Groups** — curated community groups, run clubs, and social organizations
- **Articles** — AI-generated weekly articles about DC events and culture
- **Weekly newsletter** — automated email digest via SES
- **Daily analytics report** — unique visitors, weekly trends, top pages, referrers, and anomaly warnings
- **Visitor tracking** — persistent cookie-based unique visitor identification
- **SEO** — structured data (JSON-LD), dynamic OG images, sitemap, robots.txt, llms.txt
- **Sharing** — Web Share API on mobile, clipboard fallback on desktop

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start local development:
   ```bash
   npx sst dev
   ```

3. Deploy:
   ```bash
   npx sst deploy                    # dev stage
   npx sst deploy --stage production # production
   ```

## Commands

```bash
# Development
npx sst dev              # Start local dev with SST
npx sst build            # Build with SST
npx sst deploy           # Deploy to AWS
npx sst test             # Run tests (Vitest)
npx sst console          # Open SST Console
npx sst diff             # Preview deployment changes

# Crawlers (local execution)
npm run crawl:dcimprov              # Dev stage
npm run crawl:dcimprov:prod         # Production stage
npm run crawl:dccomedyloft          # Dev stage
npm run crawl:dccomedyloft:prod     # Production stage

# Database
npm run script:seed      # Seed database with sample data
```

## Environment Variables

See `.env.example`. Key vars: `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `AWS_REGION`, `DB_NAME`. SST-managed secrets include `OPENWEBNINJA_API_KEY` and `OPENROUTER_API_KEY`.

## Data Flow

1. **Crawlers** (ECS tasks) scrape event sources on scheduled crons
2. Events are sent to **Step Functions** for normalization and validation
3. Normalized events are saved to **DynamoDB** (single-table design)
4. **Next.js frontend** fetches events from API Gateway with field projection support
5. **Middleware** tracks page views via persistent visitor cookies → SQS → DynamoDB
6. **Daily Lambda** computes analytics and sends email reports via SES
