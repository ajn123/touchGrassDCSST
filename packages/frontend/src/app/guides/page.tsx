import GuideCard from "@/components/GuideCard";
import { getGuides } from "@/lib/dynamodb/dynamodb-guides";
import type { Metadata } from "next";

export const revalidate = 7200;

export const metadata: Metadata = {
  title: "DC Guides - First-Timer Tips & Local Knowledge | TouchGrass DC",
  description:
    "In-depth guides to Washington DC — from first-time visitor tips to hidden gems only locals know. Everything you need to make the most of the District.",
  openGraph: {
    title: "DC Guides | TouchGrass DC",
    description:
      "In-depth guides to Washington DC — first-time visitor tips, neighborhoods, food, nightlife, and more.",
    url: "https://touchgrassdc.com/guides",
  },
};

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1
          className="text-4xl font-bold mb-2 text-center"
          style={{ color: "var(--text-primary)" }}
        >
          DC Guides
        </h1>
        <p
          className="text-center mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          In-depth guides to help you explore Washington DC like a local
        </p>

        {guides.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              No guides yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <GuideCard
                key={guide.slug}
                slug={guide.slug}
                title={guide.title}
                excerpt={guide.excerpt}
                category={guide.category}
                publishedAt={guide.publishedAt}
                imageUrl={guide.image_url}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
