import ArticleCard from "@/components/ArticleCard";
import { getArticle, getArticles } from "@/lib/dynamodb/dynamodb-articles";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const slug = decodeURIComponent(awaitedParams.slug);
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Article Not Found | TouchGrass DC" };
  }

  return {
    title: `${article.title} | TouchGrass DC`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: new Date(article.publishedAt).toISOString(),
      url: `https://touchgrassdc.com/articles/${slug}`,
      images: article.image_url ? [{ url: article.image_url, width: 1200, height: 630 }] : [],
      siteName: "TouchGrass DC",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: article.image_url ? [article.image_url] : [],
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

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const awaitedParams = await params;
  const slug = decodeURIComponent(awaitedParams.slug);
  const article = await getArticle(slug);

  if (!article) {
    return (
      <main className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1
            className="text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Article Not Found
          </h1>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            This article doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/articles"
            className="font-medium"
            style={{ color: "var(--accent-primary)" }}
          >
            Back to Articles
          </Link>
        </div>
      </main>
    );
  }

  // Fetch related articles (same category, different slug)
  const allArticles = await getArticles();
  const relatedArticles = allArticles
    .filter((a) => a.slug !== slug)
    .sort((a, b) => {
      // Prefer same category
      const aMatch = a.category === article.category ? 1 : 0;
      const bMatch = b.category === article.category ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.publishedAt - a.publishedAt;
    })
    .slice(0, 3);

  return (
    <main className="min-h-screen">
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/articles"
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
            All Articles
          </Link>

          <div className="flex items-center gap-3 mt-4 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "white",
              }}
            >
              {article.category}
            </span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {formatDate(article.publishedAt)}
            </span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {estimateReadTime(article.content)}
            </span>
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {article.title}
          </h1>
        </div>

        {/* Cover Image */}
        {article.image_url && (
          <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="prose prose-lg max-w-none article-content"
          style={{ color: "var(--text-primary)" }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Sources Section */}
        {article.sources && article.sources.length > 0 && (
          <div
            className="mt-12 pt-8"
            style={{ borderTopWidth: "1px", borderColor: "var(--border-primary)" }}
          >
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Sources
            </h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
              This article was researched using real discussions from r/washingtondc,
              r/nova, r/maryland, and Google Reviews.
            </p>
            <ul className="space-y-2">
              {article.sources.map((source, i) => (
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

        {/* Places Referenced */}
        {article.places && article.places.length > 0 && (
          <div
            className="mt-8 pt-6"
            style={{ borderTopWidth: "1px", borderColor: "var(--border-primary)" }}
          >
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Places Mentioned
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {article.places
                .filter((p) => p.name && p.rating > 0)
                .map((place, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      borderWidth: "1px",
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    <p
                      className="font-medium text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {place.name}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {place.rating}/5 — {place.address}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div
            className="pt-8 mb-6"
            style={{ borderTopWidth: "1px", borderColor: "var(--border-primary)" }}
          >
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              More Articles
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((related) => (
              <ArticleCard
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
