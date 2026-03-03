import Categories from "@/components/Categories";
import FeaturedGroups from "@/components/FeaturedGroups";
import MonthlyCalendar from "@/components/MonthlyCalendar";
import PersonalizedEvents from "@/components/PersonalizedEvents";
import SearchBar from "@/components/SearchBar";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { getCategoriesFromEvents } from "@/lib/filter-events";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Image from "next/image";
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

async function submitForm(formData: FormData) {
  "use server";

  // Get the image key from form data
  const imageKey = formData.get("imageKey") as string;

  console.log("Form submission with image key:", imageKey);

  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const response = await db.createEvent(formData);
  revalidatePath("/");
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

      {/* Compact Calendar Section */}
      <MonthlyCalendar variant="compact" />

      {/* Featured Groups Section */}
      <FeaturedGroups />

      {/* Homepage Map Section }
      
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <HomepageMap />
      </section>

      */}

      <Categories categories={categories as Category[]} />

      {/* Analytics handled centrally in middleware */}

      {/* <RecurringEvent /> */}
    </main>
  );
}
