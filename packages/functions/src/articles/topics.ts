export interface ArticleTopic {
  slug: string;
  title: string;
  redditQueries: string[];
  googlePlacesQuery: string | null;
  promptContext: string;
  category: string;
}

export const ARTICLE_TOPICS: ArticleTopic[] = [
  {
    slug: "best-coffee-shops",
    title: "Best Coffee Shops in DC",
    redditQueries: ["best coffee DC", "coffee shop recommendation DC", "favorite cafe washington"],
    googlePlacesQuery: "best coffee shops Washington DC",
    promptContext: "Focus on independent/local shops, not just Starbucks. Mention what makes each one special — the vibe, the espresso, pastries, work-from-home friendliness.",
    category: "Food & Drink",
  },
  {
    slug: "best-bbq",
    title: "Best BBQ in the DMV",
    redditQueries: ["best bbq DC", "barbecue DMV", "best brisket washington DC"],
    googlePlacesQuery: "best BBQ restaurant Washington DC",
    promptContext: "Cover different BBQ styles (Texas, Carolina, Memphis). Mention signature dishes, portion sizes, and whether they have outdoor seating.",
    category: "Food & Drink",
  },
  {
    slug: "best-free-things",
    title: "Best Free Things to Do in DC",
    redditQueries: ["free things to do DC", "free activities washington", "free events DC this month"],
    googlePlacesQuery: null,
    promptContext: "Highlight that DC is one of the best cities for free entertainment — Smithsonians, memorials, free concerts, gallery openings, farmers markets. Include lesser-known freebies.",
    category: "Community",
  },
  {
    slug: "instagram-restaurants",
    title: "Most Instagram-Worthy Restaurants in DC",
    redditQueries: ["instagrammable restaurants DC", "prettiest restaurants DC", "aesthetic cafe washington", "photogenic restaurant DC"],
    googlePlacesQuery: "instagram worthy restaurant Washington DC",
    promptContext: "Focus on the visual experience — interior design, plating, rooftop views, neon signs, flower walls. Mention the best dishes to photograph and ideal time to visit for lighting.",
    category: "Food & Drink",
  },
  {
    slug: "making-friends",
    title: "Best Ways to Make Friends in DC",
    redditQueries: ["how to make friends DC", "meeting people washington DC", "social groups DC", "lonely in DC"],
    googlePlacesQuery: null,
    promptContext: "DC has a huge transplant population — lots of people looking for friends. Cover run clubs, social sports leagues (DC Fray, Volo), meetup groups, climbing gyms, dance classes, volunteer orgs, and bar trivia.",
    category: "Community",
  },
  {
    slug: "best-dance-classes",
    title: "Best Dance Classes & Social Dances in the DMV",
    redditQueries: ["dance classes DC", "salsa dancing DC", "swing dance washington", "social dancing DMV"],
    googlePlacesQuery: "dance classes Washington DC",
    promptContext: "Cover salsa, bachata, swing, two-step, and more. Mention beginner-friendly options, no-partner-needed nights, and the best social dances where you can practice.",
    category: "Arts & Culture",
  },
  {
    slug: "best-happy-hours",
    title: "Best Happy Hours in DC",
    redditQueries: ["best happy hour DC", "cheap drinks DC", "happy hour deals washington"],
    googlePlacesQuery: "best happy hour Washington DC",
    promptContext: "Include specific deals (e.g., '$6 margaritas', 'half-price oysters'). Mention the vibe — after-work crowd, date-worthy, rooftop, dive bar. Note which neighborhoods have the best concentration of options.",
    category: "Food & Drink",
  },
  {
    slug: "hidden-gems",
    title: "Hidden Gems of the DMV",
    redditQueries: ["hidden gems DC", "underrated spots DC", "secret places washington", "lesser known DC"],
    googlePlacesQuery: null,
    promptContext: "The stuff tourists never find. Speakeasies, hole-in-the-wall restaurants, secret gardens, off-the-beaten-path museums, underground art spaces. The more obscure, the better.",
    category: "Community",
  },
  {
    slug: "best-date-spots",
    title: "Best Date Spots in DC",
    redditQueries: ["date ideas DC", "romantic restaurants DC", "first date spots washington", "date night DC"],
    googlePlacesQuery: "romantic restaurant Washington DC",
    promptContext: "Cover the spectrum: first dates (low-pressure, casual), established couples (fancy dinner), adventurous dates (axe throwing, escape rooms). Mention price ranges.",
    category: "Food & Drink",
  },
  {
    slug: "best-brunch",
    title: "Best Brunch Spots in DC",
    redditQueries: ["best brunch DC", "brunch recommendations washington", "bottomless brunch DC"],
    googlePlacesQuery: "best brunch Washington DC",
    promptContext: "Brunch is a religion in DC. Cover bottomless options, boozy brunch, healthy brunch, and the best classic eggs benedict. Mention wait times and reservation tips.",
    category: "Food & Drink",
  },
  {
    slug: "best-pizza",
    title: "Best Pizza in the DMV",
    redditQueries: ["best pizza DC", "pizza recommendations DMV", "favorite pizza washington"],
    googlePlacesQuery: "best pizza Washington DC",
    promptContext: "Cover different styles: NY-style, Neapolitan, Detroit, by-the-slice late-night spots. Mention signature pies and whether they do delivery.",
    category: "Food & Drink",
  },
  {
    slug: "best-outdoor-activities",
    title: "Best Outdoor Activities in the DMV",
    redditQueries: ["outdoor activities DC", "hiking near DC", "best parks washington", "kayaking DC"],
    googlePlacesQuery: null,
    promptContext: "Rock Creek Park, Great Falls, Billy Goat Trail, C&O Canal, Shenandoah day trips. Include seasonal activities — cherry blossoms, fall foliage, summer kayaking, winter ice skating.",
    category: "Outdoors & Recreation",
  },
  {
    slug: "best-live-music",
    title: "Best Live Music Venues in DC",
    redditQueries: ["live music DC", "best music venues DC", "concert venues washington"],
    googlePlacesQuery: "live music venue Washington DC",
    promptContext: "From intimate jazz clubs to big concert halls. Cover different genres — jazz (Blues Alley), rock (9:30 Club, Black Cat), indie, go-go music (DC's own genre!).",
    category: "Music",
  },
  {
    slug: "best-food-trucks",
    title: "Best Food Trucks in DC",
    redditQueries: ["best food trucks DC", "food truck recommendations washington", "lunch trucks DC"],
    googlePlacesQuery: null,
    promptContext: "DC has an incredible food truck scene. Cover where to find them (L'Enfant Plaza, Farragut Square, Union Market area) and the standout trucks by cuisine type.",
    category: "Food & Drink",
  },
  {
    slug: "best-rooftop-bars",
    title: "Best Rooftop Bars in DC",
    redditQueries: ["rooftop bars DC", "best rooftop DC", "outdoor drinking washington"],
    googlePlacesQuery: "rooftop bar Washington DC",
    promptContext: "DC's skyline is gorgeous and the building height limit means rooftops have unobstructed views. Mention which ones have monument views, the drink prices, and dress codes.",
    category: "Food & Drink",
  },
  {
    slug: "best-bookstores",
    title: "Best Bookstores & Cozy Reading Spots in DC",
    redditQueries: ["bookstores DC", "best bookstore washington", "cozy spots to read DC"],
    googlePlacesQuery: "independent bookstore Washington DC",
    promptContext: "Cover independent bookstores (Politics and Prose, Solid State Books, East City Bookshop, Kramers), their events, and the best nearby cafes for reading.",
    category: "Arts & Culture",
  },
  {
    slug: "best-farmers-markets",
    title: "Best Farmers Markets in the DMV",
    redditQueries: ["farmers market DC", "best farmers market DMV", "fresh produce washington"],
    googlePlacesQuery: "farmers market Washington DC",
    promptContext: "Cover the big ones (Dupont Circle, Eastern Market) and neighborhood gems. Mention seasonal highlights, standout vendors, and tips for getting the best stuff.",
    category: "Food & Drink",
  },
  {
    slug: "best-museums",
    title: "Best Museums in DC (Free & Paid)",
    redditQueries: ["best museums DC", "museum recommendations washington", "underrated museums DC"],
    googlePlacesQuery: null,
    promptContext: "Most Smithsonians are free! Cover which ones are actually worth the visit (Air & Space, African American History, Natural History), plus paid gems (Spy Museum, Phillips Collection, Artechouse).",
    category: "Arts & Culture",
  },
  {
    slug: "best-running-routes",
    title: "Best Running Routes in DC",
    redditQueries: ["running routes DC", "best places to run washington", "running trails DMV"],
    googlePlacesQuery: null,
    promptContext: "Cover the classics (Mall loop, Rock Creek Trail, Georgetown Waterfront, Mt. Vernon Trail) and distance options. Mention water fountains, bathroom stops, and which routes are well-lit for night running.",
    category: "Outdoors & Recreation",
  },
  {
    slug: "best-late-night-eats",
    title: "Best Late Night Eats in DC",
    redditQueries: ["late night food DC", "restaurants open late DC", "after midnight food washington"],
    googlePlacesQuery: "late night restaurant Washington DC",
    promptContext: "DC's late-night food scene is underrated. Cover pizza slices, diners, food trucks that stay open late, and 24-hour spots. Mention which neighborhoods are best for late-night munchies.",
    category: "Food & Drink",
  },
];

/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the topic for a given week, cycling through all topics
 */
export function getTopicForWeek(date: Date): ArticleTopic {
  const week = getWeekNumber(date);
  return ARTICLE_TOPICS[week % ARTICLE_TOPICS.length];
}

/**
 * Generate the article slug for a specific week
 */
export function generateArticleSlug(topicSlug: string, date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${topicSlug}-${year}-w${week}`;
}
