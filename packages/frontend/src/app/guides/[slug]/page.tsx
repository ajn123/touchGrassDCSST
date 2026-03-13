import GuideCard from "@/components/GuideCard";
import { ShareButton } from "@/components/ShareButton";
import { getGuide, getGuides } from "@/lib/dynamodb/dynamodb-guides";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import GuideTableOfContents from "./GuideTableOfContents";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "p", "ul", "ol", "li", "a", "strong", "em", "br", "span", "blockquote",
  ],
  allowedAttributes: { a: ["href", "target", "rel", "id"], "*": ["class", "id"] },
};

export const revalidate = 7200;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const slug = decodeURIComponent(awaitedParams.slug);
  const guide = await getGuide(slug);

  if (!guide) {
    return { title: "Guide Not Found | TouchGrass DC" };
  }

  return {
    title: `${guide.title} | TouchGrass DC`,
    description: guide.excerpt,
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      type: "article",
      publishedTime: new Date(guide.publishedAt).toISOString(),
      url: `https://touchgrassdc.com/guides/${slug}`,
      images: guide.image_url
        ? [{ url: guide.image_url, width: 1200, height: 630 }]
        : [],
      siteName: "TouchGrass DC",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.excerpt,
      images: guide.image_url ? [guide.image_url] : [],
    },
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estimateReadTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/** Extract h2 headings from HTML content for table of contents */
function extractHeadings(html: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const re = /<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    headings.push({ id: match[1], text: match[2].replace(/<[^>]*>/g, "") });
  }
  return headings;
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const awaitedParams = await params;
  const slug = decodeURIComponent(awaitedParams.slug);
  const guide = await getGuide(slug);

  if (!guide) {
    return (
      <main className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1
            className="text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Guide Not Found
          </h1>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            This guide doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/guides"
            className="font-medium"
            style={{ color: "var(--accent-primary)" }}
          >
            Back to Guides
          </Link>
        </div>
      </main>
    );
  }

  const sanitizedContent = sanitizeHtml(guide.content, SANITIZE_OPTIONS);
  const headings = extractHeadings(sanitizedContent);

  // Related guides
  const allGuides = await getGuides();
  const relatedGuides = allGuides
    .filter((g) => g.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.category === guide.category ? 1 : 0;
      const bMatch = b.category === guide.category ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.publishedAt - a.publishedAt;
    })
    .slice(0, 3);

  const guideJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt,
    image: guide.image_url || undefined,
    datePublished: new Date(guide.publishedAt).toISOString(),
    dateModified: new Date(
      guide.updatedAt || guide.publishedAt
    ).toISOString(),
    author: {
      "@type": "Organization",
      name: "TouchGrass DC",
      url: "https://touchgrassdc.com",
      description:
        "AI-assisted content based on real community discussions and reviews",
    },
    publisher: {
      "@type": "Organization",
      name: "TouchGrass DC",
      url: "https://touchgrassdc.com",
    },
    mainEntityOfPage: `https://touchgrassdc.com/guides/${slug}`,
    articleSection: guide.category,
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd) }}
      />

      {/* Header area */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/guides"
            className="text-sm font-medium mb-4 inline-flex items-center"
            style={{ color: "var(--accent-primary)" }}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Guides
          </Link>

          <div className="flex items-center gap-3 mt-4 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "white",
              }}
            >
              {guide.category}
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatDate(guide.publishedAt)}
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              {estimateReadTime(guide.content)}
            </span>
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold leading-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {guide.title}
          </h1>
          <ShareButton
            title={guide.title}
            text={guide.excerpt}
            url={`https://touchgrassdc.com/guides/${slug}`}
          />
        </div>

        {/* Cover Image */}
        {guide.image_url && (
          <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            <Image
              src={guide.image_url}
              alt={guide.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        )}
      </div>

      {/* Content + Sidebar layout */}
      <div className="max-w-7xl mx-auto px-4 flex gap-8">
        {/* Table of Contents sidebar — desktop only */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0">
            <GuideTableOfContents headings={headings} />
          </aside>
        )}

        <article className="max-w-3xl flex-1 min-w-0">
          {/* AI Disclosure */}
          <div
            className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm mb-8"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderWidth: "1px",
              borderColor: "var(--border-primary)",
              color: "var(--text-tertiary)",
            }}
          >
            <span className="text-base leading-5" aria-hidden="true">
              &#10024;
            </span>
            <span>
              This guide was written with AI assistance using real community
              discussions, reviews, and local knowledge as source material.
            </span>
          </div>

          {/* Guide Content */}
          <div
            className="prose prose-lg max-w-none article-content"
            style={{ color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Places Mentioned */}
          {guide.places && guide.places.length > 0 && (
            <div
              className="mt-12 pt-8"
              style={{
                borderTopWidth: "1px",
                borderColor: "var(--border-primary)",
              }}
            >
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Places Mentioned
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Explore the places mentioned in this guide
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guide.places
                  .filter((p) => p.name && p.rating > 0)
                  .map((place, i) => {
                    const href =
                      place.website ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`;
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-3 block transition-colors"
                        style={{
                          backgroundColor: "var(--bg-tertiary)",
                          borderWidth: "1px",
                          borderColor: "var(--border-primary)",
                        }}
                      >
                        <p
                          className="font-medium text-sm"
                          style={{ color: "var(--accent-primary)" }}
                        >
                          {place.name}
                          <span className="inline-block ml-1 text-xs">
                            &#8599;
                          </span>
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {place.rating}/5 — {place.address}
                        </p>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Sources */}
          {guide.sources && guide.sources.length > 0 && (
            <div
              className="mt-8 pt-6"
              style={{
                borderTopWidth: "1px",
                borderColor: "var(--border-primary)",
              }}
            >
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Sources
              </h2>
              <p
                className="text-sm mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                This guide was researched using real discussions from
                r/washingtondc, r/nova, r/maryland, and travel forums.
              </p>
              <ul className="space-y-2">
                {guide.sources.map((source, i) => (
                  <li key={i}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter CTA */}
          <div
            className="mt-12 rounded-2xl p-6 sm:p-8 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Planning a DC trip?
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Get a curated weekly digest of the best events and things to do —
              delivered every Thursday.
            </p>
            <a
              href="/signup-emails"
              className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#10b981" }}
            >
              Subscribe Free
            </a>
          </div>
        </article>
      </div>

      {/* Related Guides */}
      {relatedGuides.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12 mt-12">
          <div
            className="pt-8 mb-6"
            style={{
              borderTopWidth: "1px",
              borderColor: "var(--border-primary)",
            }}
          >
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              More Guides
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedGuides.map((related) => (
              <GuideCard
                key={related.slug}
                slug={related.slug}
                title={related.title}
                excerpt={related.excerpt}
                category={related.category}
                publishedAt={related.publishedAt}
                imageUrl={related.image_url}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
