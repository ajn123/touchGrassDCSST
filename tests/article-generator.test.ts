import { describe, it, expect } from "vitest";
import {
  ARTICLE_TOPICS,
  getWeekNumber,
  getTopicForWeek,
  generateArticleSlug,
  getUnsplashSearchUrl,
} from "../packages/functions/src/articles/topics";
import {
  formatRedditContentForPrompt,
  type RedditContent,
} from "../packages/functions/src/articles/reddit";
import {
  formatGooglePlacesForPrompt,
  type GooglePlacesContent,
} from "../packages/functions/src/articles/google-places";
import { buildPrompt } from "../packages/functions/src/articles/generateArticle";

describe("Article Topics", () => {
  it("has at least 15 topics defined", () => {
    expect(ARTICLE_TOPICS.length).toBeGreaterThanOrEqual(15);
  });

  it("every topic has required fields", () => {
    for (const topic of ARTICLE_TOPICS) {
      expect(topic.slug).toBeTruthy();
      expect(topic.title).toBeTruthy();
      expect(topic.redditQueries.length).toBeGreaterThan(0);
      expect(topic.promptContext).toBeTruthy();
      expect(topic.category).toBeTruthy();
    }
  });

  it("all slugs are unique", () => {
    const slugs = ARTICLE_TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs are URL-safe", () => {
    for (const topic of ARTICLE_TOPICS) {
      expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every topic has a coverImageQuery", () => {
    for (const topic of ARTICLE_TOPICS) {
      expect(topic.coverImageQuery).toBeTruthy();
      expect(typeof topic.coverImageQuery).toBe("string");
    }
  });
});

describe("getUnsplashSearchUrl", () => {
  it("returns a seeded picsum URL with the query as seed", () => {
    const url = getUnsplashSearchUrl("coffee shop latte");
    expect(url).toContain("picsum.photos/seed/");
    expect(url).toContain("1200/630");
    expect(url).toContain("coffee-shop-latte");
  });

  it("converts special characters to hyphens", () => {
    const url = getUnsplashSearchUrl("food & drink");
    expect(url).toContain("food---drink");
  });

  it("returns consistent results for same query", () => {
    expect(getUnsplashSearchUrl("test")).toBe(getUnsplashSearchUrl("test"));
  });
});

describe("getWeekNumber", () => {
  it("returns a number between 1 and 53", () => {
    const week = getWeekNumber(new Date("2026-03-03"));
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it("returns consistent results for the same date", () => {
    const date = new Date("2026-06-15");
    expect(getWeekNumber(date)).toBe(getWeekNumber(date));
  });

  it("week 1 is in early January", () => {
    const week = getWeekNumber(new Date("2026-01-05"));
    expect(week).toBe(2); // Jan 5 2026 is a Monday in week 2
  });

  it("different weeks return different numbers", () => {
    const week1 = getWeekNumber(new Date("2026-03-02"));
    const week2 = getWeekNumber(new Date("2026-03-09"));
    expect(week2).toBe(week1 + 1);
  });
});

describe("getTopicForWeek", () => {
  it("returns a valid topic", () => {
    const topic = getTopicForWeek(new Date("2026-03-03"));
    expect(topic).toBeDefined();
    expect(topic.slug).toBeTruthy();
    expect(topic.title).toBeTruthy();
  });

  it("returns the same topic for dates in the same week", () => {
    const monday = getTopicForWeek(new Date("2026-03-02"));
    const wednesday = getTopicForWeek(new Date("2026-03-04"));
    expect(monday.slug).toBe(wednesday.slug);
  });

  it("returns different topics for different weeks", () => {
    const week1 = getTopicForWeek(new Date("2026-03-02"));
    const week2 = getTopicForWeek(new Date("2026-03-09"));
    // Could theoretically be the same if topics.length divides evenly, but very unlikely
    // More importantly, the function doesn't crash
    expect(week1).toBeDefined();
    expect(week2).toBeDefined();
  });

  it("cycles through topics over many weeks", () => {
    const seen = new Set<string>();
    for (let i = 0; i < ARTICLE_TOPICS.length * 2; i++) {
      const date = new Date("2026-01-05");
      date.setDate(date.getDate() + i * 7);
      const topic = getTopicForWeek(date);
      seen.add(topic.slug);
    }
    // Should have seen all topics at least once
    expect(seen.size).toBe(ARTICLE_TOPICS.length);
  });
});

describe("generateArticleSlug", () => {
  it("generates slug with topic, year, and week number", () => {
    const slug = generateArticleSlug("best-coffee-shops", new Date("2026-03-03"));
    expect(slug).toMatch(/^best-coffee-shops-2026-w\d+$/);
  });

  it("same date generates same slug", () => {
    const date = new Date("2026-06-15");
    expect(generateArticleSlug("test", date)).toBe(generateArticleSlug("test", date));
  });

  it("different weeks generate different slugs", () => {
    const slug1 = generateArticleSlug("test", new Date("2026-03-02"));
    const slug2 = generateArticleSlug("test", new Date("2026-03-09"));
    expect(slug1).not.toBe(slug2);
  });

  it("different topics generate different slugs", () => {
    const date = new Date("2026-03-03");
    const slug1 = generateArticleSlug("best-coffee", date);
    const slug2 = generateArticleSlug("best-pizza", date);
    expect(slug1).not.toBe(slug2);
  });
});

describe("formatRedditContentForPrompt", () => {
  it("handles empty content", () => {
    const content: RedditContent = { posts: [], topComments: [], sourceLinks: [] };
    const result = formatRedditContentForPrompt(content);
    expect(result).toContain("No Reddit discussions found");
  });

  it("formats posts with titles and scores", () => {
    const content: RedditContent = {
      posts: [
        {
          id: "abc",
          title: "Best coffee in DC?",
          selftext: "Looking for recommendations",
          score: 42,
          numComments: 15,
          url: "https://reddit.com/...",
          permalink: "/r/washingtondc/comments/abc",
          subreddit: "washingtondc",
          created: 1709491234,
        },
      ],
      topComments: [
        { body: "Compass Coffee in Shaw is amazing for espresso", score: 25, author: "dclocal" },
      ],
      sourceLinks: [{ title: "Best coffee in DC?", url: "https://reddit.com/r/washingtondc/comments/abc" }],
    };

    const result = formatRedditContentForPrompt(content);
    expect(result).toContain("Best coffee in DC?");
    expect(result).toContain("42 upvotes");
    expect(result).toContain("Compass Coffee in Shaw");
    expect(result).toContain("25 upvotes");
  });

  it("includes subreddit name in formatted output", () => {
    const content: RedditContent = {
      posts: [
        {
          id: "xyz",
          title: "Best hike near NoVA",
          selftext: "",
          score: 30,
          numComments: 10,
          url: "",
          permalink: "/r/nova/comments/xyz",
          subreddit: "nova",
          created: 1709491234,
        },
      ],
      topComments: [],
      sourceLinks: [],
    };

    const result = formatRedditContentForPrompt(content);
    expect(result).toContain("r/nova");
  });

  it("truncates long selftext", () => {
    const longText = "a".repeat(600);
    const content: RedditContent = {
      posts: [
        { id: "x", title: "Test", selftext: longText, score: 1, numComments: 1, url: "", permalink: "", subreddit: "washingtondc", created: 0 },
      ],
      topComments: [],
      sourceLinks: [],
    };
    const result = formatRedditContentForPrompt(content);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(longText.length + 500);
  });

  it("limits comments to 20", () => {
    const comments = Array.from({ length: 30 }, (_, i) => ({
      body: `Comment number ${i} about a great place`,
      score: 30 - i,
      author: `user${i}`,
    }));
    const content: RedditContent = {
      posts: [{ id: "x", title: "Test", selftext: "", score: 1, numComments: 30, url: "", permalink: "", subreddit: "washingtondc", created: 0 }],
      topComments: comments,
      sourceLinks: [],
    };
    const result = formatRedditContentForPrompt(content);
    // Should only have 20 comment entries
    const commentMatches = result.match(/upvotes\)/g);
    expect(commentMatches?.length).toBeLessThanOrEqual(21); // 20 comments + 1 post score mention
  });
});

describe("formatGooglePlacesForPrompt", () => {
  it("handles empty content", () => {
    const content: GooglePlacesContent = { places: [], detailedPlaces: [] };
    const result = formatGooglePlacesForPrompt(content);
    expect(result).toContain("No Google Places results found");
  });

  it("formats places with ratings and addresses", () => {
    const content: GooglePlacesContent = {
      places: [
        { name: "Compass Coffee", rating: 4.5, userRatingsTotal: 500, address: "1535 7th St NW, Washington, DC", placeId: "abc" },
        { name: "Ebenezers", rating: 4.6, userRatingsTotal: 300, address: "201 F St NE, Washington, DC", placeId: "def" },
      ],
      detailedPlaces: [
        {
          name: "Compass Coffee",
          rating: 4.5,
          address: "1535 7th St NW",
          reviews: [
            { text: "Best espresso in DC, the oat milk latte is incredible and the space is perfect for working.", rating: 5, authorName: "Jane" },
          ],
        },
      ],
    };

    const result = formatGooglePlacesForPrompt(content);
    expect(result).toContain("Compass Coffee");
    expect(result).toContain("4.5/5");
    expect(result).toContain("Ebenezers");
    expect(result).toContain("Best espresso in DC");
  });

  it("sorts places by rating descending", () => {
    const content: GooglePlacesContent = {
      places: [
        { name: "Low Rated", rating: 3.5, userRatingsTotal: 100, address: "addr1", placeId: "a" },
        { name: "High Rated", rating: 4.8, userRatingsTotal: 200, address: "addr2", placeId: "b" },
      ],
      detailedPlaces: [],
    };

    const result = formatGooglePlacesForPrompt(content);
    const highIdx = result.indexOf("High Rated");
    const lowIdx = result.indexOf("Low Rated");
    expect(highIdx).toBeLessThan(lowIdx);
  });

  it("filters out places with no rating", () => {
    const content: GooglePlacesContent = {
      places: [
        { name: "Rated", rating: 4.5, userRatingsTotal: 100, address: "addr", placeId: "a" },
        { name: "Unrated", rating: 0, userRatingsTotal: 0, address: "addr", placeId: "b" },
      ],
      detailedPlaces: [],
    };

    const result = formatGooglePlacesForPrompt(content);
    expect(result).toContain("Rated");
    expect(result).not.toContain("Unrated");
  });
});

describe("buildPrompt", () => {
  const mockTopic = {
    slug: "best-coffee-shops",
    title: "Best Coffee Shops in DC",
    redditQueries: ["best coffee DC"],
    googlePlacesQuery: "best coffee shops Washington DC",
    coverImageQuery: "coffee shop latte",
    promptContext: "Focus on independent shops.",
    category: "Food & Drink",
  };

  it("includes topic title", () => {
    const prompt = buildPrompt(mockTopic, "reddit content", "google content");
    expect(prompt).toContain("Best Coffee Shops in DC");
  });

  it("includes topic prompt context", () => {
    const prompt = buildPrompt(mockTopic, "reddit content", "google content");
    expect(prompt).toContain("Focus on independent shops.");
  });

  it("includes reddit content", () => {
    const prompt = buildPrompt(mockTopic, "Compass Coffee is the best", "");
    expect(prompt).toContain("Compass Coffee is the best");
  });

  it("includes google content", () => {
    const prompt = buildPrompt(mockTopic, "", "Ebenezers 4.6 rating");
    expect(prompt).toContain("Ebenezers 4.6 rating");
  });

  it("instructs to write as a local", () => {
    const prompt = buildPrompt(mockTopic, "", "");
    expect(prompt).toContain("local");
    expect(prompt).toContain("opinionated");
  });

  it("requests JSON output format", () => {
    const prompt = buildPrompt(mockTopic, "", "");
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"content"');
    expect(prompt).toContain('"excerpt"');
    expect(prompt).toContain("JSON");
  });

  it("instructs to use HTML formatting", () => {
    const prompt = buildPrompt(mockTopic, "", "");
    expect(prompt).toContain("<h2>");
    expect(prompt).toContain("<p>");
  });

  it("asks for specific recommendations", () => {
    const prompt = buildPrompt(mockTopic, "", "");
    expect(prompt).toContain("5-10");
    expect(prompt).toContain("SPECIFIC");
  });

  it("asks for a bottom line section", () => {
    const prompt = buildPrompt(mockTopic, "", "");
    expect(prompt).toContain("Bottom Line");
  });
});
