import ArticleCard from "@/components/ArticleCard";
import BigEvents from "@/components/BigEvents";
import Categories from "@/components/Categories";
import NewsletterBanner from "@/components/NewsletterBanner";
import PersonalizedEvents from "@/components/PersonalizedEvents";
import SearchBar from "@/components/SearchBar";
import TonightInDC from "@/components/TonightInDC";
import WeekendEvents from "@/components/WeekendEvents";
import { getArticles } from "@/lib/dynamodb/dynamodb-articles";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { getBigEvents } from "@/lib/event-scoring";
import { getCategoriesFromEvents } from "@/lib/filter-events";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "TouchGrass DC - Discover Things to Do in Washington DC",
  description:
    "Your guide to everything happening in the District. Find events, comedy shows, community groups, and the best spots in the DMV — powered by real local opinions.",
  openGraph: {
    title: "TouchGrass DC - Discover Things to Do in Washington DC",
    description:
      "Your guide to everything happening in the District. Find events, comedy shows, community groups, and the best spots in the DMV.",
    url: "https://touchgrassdc.com",
  },
};

interface Category {
  category: string;
}

export default async function Home() {
  // This runs on the server during rendering (like useEffect but server-side)
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  
  // Fetch current and future events only (not past events)
  const events = await db.getCurrentAndFutureEvents();
  
  // Extract categories from events that actually exist
  // This ensures we only show categories that will return results
  const categoryStrings = getCategoriesFromEvents(events);
  
  // Convert to the format expected by Categories component
  const categories: Category[] = categoryStrings.map((cat) => ({ category: cat }));

  // Filter events happening this weekend (Fri/Sat/Sun)
  const weekendDates = getWeekendDates();
  const weekendEvents = events
    .filter((e: any) => e.start_date && weekendDates.includes(e.start_date))
    .sort((a: any, b: any) => {
      const dateCmp = (a.start_date || "").localeCompare(b.start_date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

  // Find "big" events worth highlighting
  const bigEvents = getBigEvents(weekendEvents);
  const bigEventIds = new Set(bigEvents.map((e: any) => e.pk || e.title));

  // Remove big events from the regular weekend list to avoid duplicates
  const regularWeekend = weekendEvents.filter(
    (e: any) => !bigEventIds.has(e.pk || e.title)
  );

  // Diversify by category: round-robin so cards aren't all the same type
  const diversifiedWeekend = diversifyByCategory(regularWeekend, 8);

  // Filter events happening tonight (next 6 hours)
  const tonightEvents = getTonightEvents(events);

  // Fetch latest articles
  const allArticles = await getArticles();
  const latestArticles = allArticles
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TouchGrass DC",
    url: "https://touchgrassdc.com",
    description:
      "Your guide to everything happening in the District. Find events, comedy shows, community groups, and the best spots in the DMV.",
    publisher: {
      "@type": "Organization",
      name: "TouchGrass DC",
      url: "https://touchgrassdc.com",
      areaServed: {
        "@type": "City",
        name: "Washington, DC",
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://touchgrassdc.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/30 z-10" />
        <Image
          src={"/images/dc-skyline.jpg"}
          alt="DC Events Hero"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="relative z-20 text-center text-white">
          <h1 className="text-6xl font-bold mb-4">
            Discover Things to Do in DC
          </h1>
          <p className="text-xl mb-8">
            Your guide to everything happening in the District
          </p>
          <div className="flex gap-4 justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Personalized Events - client component that hydrates after SSR */}
      <PersonalizedEvents />

      {/* Tonight in DC — events happening in the next few hours */}
      <TonightInDC events={tonightEvents} />

      {/* Don't Miss This Weekend — big events scored by importance */}
      <BigEvents events={bigEvents} />

      {/* Happening This Weekend */}
      <WeekendEvents events={diversifiedWeekend} />

      {/* Newsletter Signup */}
      <NewsletterBanner />

      {/* Browse by Category */}
      <Categories categories={categories as Category[]} />

      {/* Latest Articles */}
      {latestArticles.length > 0 && (
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Latest Articles
            </h2>
            <Link
              href="/articles"
              className="text-sm font-medium flex items-center"
              style={{ color: "var(--accent-primary)" }}
            >
              View all
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestArticles.map((article) => (
              <ArticleCard
                key={article.slug}
                slug={article.slug}
                title={article.title}
                excerpt={article.excerpt}
                category={article.category}
                publishedAt={article.publishedAt}
                imageUrl={article.image_url}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/** Returns YYYY-MM-DD strings for this weekend's Fri, Sat, Sun in Eastern Time. */
function getWeekendDates(): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  const todayStr = fmt.format(now); // "YYYY-MM-DD"
  const today = new Date(todayStr + "T12:00:00");
  const dow = today.getDay(); // 0=Sun, 5=Fri, 6=Sat

  // Calculate days until Friday
  let daysToFri = (5 - dow + 7) % 7;
  // If it's Mon-Thu, jump to the upcoming Friday
  // If it's Fri/Sat/Sun, we're in the current weekend
  if (dow === 0) {
    // Sunday — show just today
    return [todayStr];
  }
  if (dow === 6) {
    // Saturday — show Sat + Sun
    const sun = new Date(today);
    sun.setDate(sun.getDate() + 1);
    return [todayStr, fmt.format(sun)];
  }
  if (dow === 5) {
    daysToFri = 0; // already Friday
  }

  const fri = new Date(today);
  fri.setDate(fri.getDate() + daysToFri);
  const sat = new Date(fri);
  sat.setDate(sat.getDate() + 1);
  const sun = new Date(fri);
  sun.setDate(sun.getDate() + 2);

  return [fmt.format(fri), fmt.format(sat), fmt.format(sun)];
}

/** Parse "7:00 PM" style time strings to 24-hour format. Returns null if unparseable. */
function parseTimeHour(t: string): number | null {
  const m = t.trim().toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/);
  if (!m) return null;
  let h = parseInt(m[1]);
  if (m[3] === "pm" && h !== 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return h;
}

/** Returns events happening today within the next 6 hours, sorted by start time. */
function getTonightEvents(events: any[]): any[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });

  const now = new Date();
  const todayStr = fmt.format(now);
  const currentHour = parseInt(hourFmt.format(now));

  return events
    .filter((e: any) => {
      if (e.start_date !== todayStr) return false;
      if (!e.start_time) return false;
      const hour = parseTimeHour(e.start_time);
      if (hour === null) return false;
      return hour >= currentHour && hour <= currentHour + 6;
    })
    .sort((a: any, b: any) => {
      const ha = parseTimeHour(a.start_time || "") ?? 24;
      const hb = parseTimeHour(b.start_time || "") ?? 24;
      return ha - hb;
    });
}

/** Round-robin across categories so results show variety. */
function diversifyByCategory(events: any[], limit: number): any[] {
  const buckets = new Map<string, any[]>();
  for (const event of events) {
    const cat = Array.isArray(event.category)
      ? event.category[0] || "General"
      : event.category || "General";
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(event);
  }
  const result: any[] = [];
  const seen = new Set<string>();
  const queues = Array.from(buckets.values());
  const indices = new Array(queues.length).fill(0);

  while (result.length < limit) {
    let added = false;
    for (let i = 0; i < queues.length; i++) {
      if (result.length >= limit) break;
      while (indices[i] < queues[i].length) {
        const event = queues[i][indices[i]];
        indices[i]++;
        const id = event.pk || event.title;
        if (!seen.has(id)) {
          seen.add(id);
          result.push(event);
          added = true;
          break;
        }
      }
    }
    if (!added) break;
  }
  return result;
}
