import ArticleCard from "@/components/ArticleCard";
import { getArticles } from "@/lib/dynamodb/dynamodb-articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1
          className="text-4xl font-bold mb-2 text-center"
          style={{ color: "var(--text-primary)" }}
        >
          Articles
        </h1>
        <p
          className="text-center mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Weekly guides powered by real DC opinions from Reddit and Google
          Reviews
        </p>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              No articles yet. Check back soon — new articles are published
              every Monday!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
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
        )}
      </div>
    </main>
  );
}
