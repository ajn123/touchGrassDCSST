const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "TouchGrassDC/1.0 (article-generator)";
const SUBREDDITS = ["washingtondc", "nova", "maryland"];

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  numComments: number;
  url: string;
  permalink: string;
  subreddit: string;
  created: number;
}

export interface RedditComment {
  body: string;
  score: number;
  author: string;
}

export interface RedditContent {
  posts: RedditPost[];
  topComments: RedditComment[];
  sourceLinks: { title: string; url: string }[];
}

/**
 * Search a single subreddit for posts matching a query
 */
export async function fetchRedditPostsFromSubreddit(
  subreddit: string,
  query: string,
  limit = 10,
): Promise<RedditPost[]> {
  const url = `${REDDIT_BASE}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=year&limit=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.warn(`Reddit search failed for r/${subreddit} "${query}": ${response.status}`);
    return [];
  }

  const data = await response.json();
  const children = data?.data?.children;

  if (!Array.isArray(children)) return [];

  return children
    .map((child: any) => ({
      id: child.data?.id || "",
      title: child.data?.title || "",
      selftext: child.data?.selftext || "",
      score: child.data?.score || 0,
      numComments: child.data?.num_comments || 0,
      url: child.data?.url || "",
      permalink: child.data?.permalink || "",
      subreddit: child.data?.subreddit || subreddit,
      created: child.data?.created_utc || 0,
    }))
    .filter((post: RedditPost) => post.id && post.title);
}

/**
 * Search all DMV subreddits for posts matching a query
 */
export async function fetchRedditPosts(query: string, limit = 10): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  for (const subreddit of SUBREDDITS) {
    const posts = await fetchRedditPostsFromSubreddit(subreddit, query, limit);
    allPosts.push(...posts);
    await new Promise((r) => setTimeout(r, 500));
  }

  return allPosts;
}

/**
 * Fetch top comments from a Reddit post using its permalink
 */
export async function fetchTopComments(permalink: string, limit = 15): Promise<RedditComment[]> {
  const url = `${REDDIT_BASE}${permalink}.json?sort=top&limit=${limit}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.warn(`Reddit comments failed for ${permalink}: ${response.status}`);
    return [];
  }

  const data = await response.json();

  // Reddit returns an array: [post, comments]
  const commentListing = data?.[1]?.data?.children;
  if (!Array.isArray(commentListing)) return [];

  return commentListing
    .filter((child: any) => child.kind === "t1" && child.data?.body)
    .map((child: any) => ({
      body: child.data.body,
      score: child.data.score || 0,
      author: child.data.author || "[deleted]",
    }))
    .filter((c: RedditComment) => c.score >= 2 && c.body.length > 20 && c.author !== "AutoModerator")
    .slice(0, limit);
}

/**
 * Gather Reddit content for multiple queries, deduplicating posts
 */
export async function gatherRedditContent(queries: string[]): Promise<RedditContent> {
  const allPosts: RedditPost[] = [];
  const seenIds = new Set<string>();

  // Fetch posts for each query with a small delay to be polite
  for (const query of queries) {
    const posts = await fetchRedditPosts(query);
    for (const post of posts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        allPosts.push(post);
      }
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Sort by relevance (score * comments)
  allPosts.sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments));

  // Take top 5 posts and fetch their comments
  const topPosts = allPosts.slice(0, 5);
  const allComments: RedditComment[] = [];

  for (const post of topPosts) {
    const comments = await fetchTopComments(post.permalink);
    allComments.push(...comments);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Deduplicate and sort comments by score
  allComments.sort((a, b) => b.score - a.score);

  const sourceLinks = topPosts.map((post) => ({
    title: post.title,
    url: `${REDDIT_BASE}${post.permalink}`,
  }));

  return {
    posts: topPosts,
    topComments: allComments.slice(0, 30),
    sourceLinks,
  };
}

/**
 * Format Reddit content into a readable string for the LLM prompt
 */
export function formatRedditContentForPrompt(content: RedditContent): string {
  if (content.posts.length === 0) {
    return "No Reddit discussions found for this topic.";
  }

  const sections: string[] = [];

  for (const post of content.posts) {
    let section = `Thread from r/${post.subreddit}: "${post.title}" (${post.score} upvotes, ${post.numComments} comments)`;
    if (post.selftext) {
      const truncated = post.selftext.length > 500
        ? post.selftext.substring(0, 500) + "..."
        : post.selftext;
      section += `\nOP says: ${truncated}`;
    }
    sections.push(section);
  }

  const commentBlock = content.topComments
    .slice(0, 20)
    .map((c) => `- "${c.body.substring(0, 300)}" (${c.score} upvotes)`)
    .join("\n");

  return `## Reddit Discussions from r/washingtondc, r/nova, and r/maryland\n\n${sections.join("\n\n")}\n\n## Top Comments\n${commentBlock}`;
}
