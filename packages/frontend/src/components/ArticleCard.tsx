import Link from "next/link";

interface ArticleCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estimateReadTime(content?: string): string {
  if (!content) return "3 min read";
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export default function ArticleCard({
  slug,
  title,
  excerpt,
  category,
  publishedAt,
}: ArticleCardProps) {
  return (
    <Link href={`/articles/${encodeURIComponent(slug)}`}>
      <article className="group rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)", borderWidth: "1px" }}
      >
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--accent-primary)", color: "white" }}
            >
              {category}
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {formatDate(publishedAt)}
            </span>
          </div>

          <h3
            className="text-lg font-bold mb-2 group-hover:underline line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h3>

          <p
            className="text-sm line-clamp-3 flex-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {excerpt}
          </p>

          <div className="mt-4 flex items-center text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
            Read article
            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>
    </Link>
  );
}
