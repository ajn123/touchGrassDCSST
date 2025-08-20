import { CrawlerConfig } from "./event-crawler";

// Specialized crawler configurations for DC event sources
export const dcEventSources: CrawlerConfig[] = [
  {
    name: "DC Government Events",
    baseUrl: "https://dc.gov",
    eventUrls: ["https://dc.gov/events", "https://dc.gov/calendar"],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      government: "Government",
      community: "Community",
      public: "Public Meeting",
      hearing: "Public Hearing",
      workshop: "Workshop",
    },
  },
  {
    name: "Smithsonian Events",
    baseUrl: "https://www.si.edu",
    eventUrls: [
      "https://www.si.edu/events",
      "https://www.si.edu/events/calendar",
    ],
    selectors: {
      eventContainer: '.event-item, .calendar-event, [class*="event"]',
      title: "h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue, .museum",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      museum: "Museum",
      exhibition: "Exhibition",
      lecture: "Lecture",
      workshop: "Workshop",
      family: "Family",
      performance: "Performance",
    },
  },
  {
    name: "Kennedy Center Events",
    baseUrl: "https://www.kennedy-center.org",
    eventUrls: [
      "https://www.kennedy-center.org/calendar",
      "https://www.kennedy-center.org/whats-on",
    ],
    selectors: {
      eventContainer: '.event-item, .performance-item, [class*="event"]',
      title: "h3, .event-title, .title, .performance-title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue, .theater",
      date: ".event-date, .date, time, .performance-date",
      category: ".event-category, .category, .type, .genre",
      image: "img",
      website: 'a[href*="/event"], a[href*="/performance"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      theater: "Theater",
      music: "Music",
      dance: "Dance",
      opera: "Opera",
      ballet: "Ballet",
      comedy: "Comedy",
      lecture: "Lecture",
    },
  },
  {
    name: "National Park Service DC Events",
    baseUrl: "https://www.nps.gov",
    eventUrls: [
      "https://www.nps.gov/state/dc/planyourvisit/events.htm",
      "https://www.nps.gov/state/dc/planyourvisit/calendar.htm",
    ],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .park",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      ranger: "Ranger Program",
      tour: "Tour",
      hike: "Hike",
      lecture: "Lecture",
      workshop: "Workshop",
      family: "Family Program",
    },
  },
  {
    name: "DC Theater Scene",
    baseUrl: "https://dctheaterscene.com",
    eventUrls: [
      "https://dctheaterscene.com/events",
      "https://dctheaterscene.com/calendar",
    ],
    selectors: {
      eventContainer: '.event-item, .show-item, [class*="event"]',
      title: "h2, h3, .event-title, .show-title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue, .theater",
      date: ".event-date, .date, time, .show-date",
      category: ".event-category, .category, .type, .genre",
      image: "img",
      website: 'a[href*="/event"], a[href*="/show"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      theater: "Theater",
      musical: "Musical",
      play: "Play",
      comedy: "Comedy",
      drama: "Drama",
      family: "Family",
    },
  },
  {
    name: "Washington Post Going Out Guide",
    baseUrl: "https://www.washingtonpost.com",
    eventUrls: [
      "https://www.washingtonpost.com/goingoutguide/events",
      "https://www.washingtonpost.com/goingoutguide/calendar",
    ],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      music: "Music",
      theater: "Theater",
      comedy: "Comedy",
      food: "Food & Drink",
      sports: "Sports",
      family: "Family",
      art: "Art",
    },
  },
  {
    name: "DCist Events",
    baseUrl: "https://dcist.com",
    eventUrls: ["https://dcist.com/events", "https://dcist.com/calendar"],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      music: "Music",
      theater: "Theater",
      comedy: "Comedy",
      food: "Food & Drink",
      sports: "Sports",
      family: "Family",
      art: "Art",
      festival: "Festival",
    },
  },
  {
    name: "Washingtonian Events",
    baseUrl: "https://www.washingtonian.com",
    eventUrls: [
      "https://www.washingtonian.com/events",
      "https://www.washingtonian.com/calendar",
    ],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      music: "Music",
      theater: "Theater",
      comedy: "Comedy",
      food: "Food & Drink",
      sports: "Sports",
      family: "Family",
      art: "Art",
      festival: "Festival",
      networking: "Networking",
    },
  },
  {
    name: "Capital Bikeshare Events",
    baseUrl: "https://www.capitalbikeshare.com",
    eventUrls: [
      "https://www.capitalbikeshare.com/events",
      "https://www.capitalbikeshare.com/community",
    ],
    selectors: {
      eventContainer: '.event-item, .community-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/community"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      bike: "Sports",
      cycling: "Sports",
      community: "Community",
      fitness: "Sports",
      outdoor: "Outdoor",
    },
  },
  {
    name: "DC Department of Parks and Recreation",
    baseUrl: "https://dpr.dc.gov",
    eventUrls: ["https://dpr.dc.gov/events", "https://dpr.dc.gov/calendar"],
    selectors: {
      eventContainer: '.event-item, .calendar-item, [class*="event"]',
      title: "h2, h3, .event-title, .title",
      description: ".event-description, .description, .summary",
      location: ".event-location, .location, .venue, .park",
      date: ".event-date, .date, time",
      category: ".event-category, .category, .type",
      image: "img",
      website: 'a[href*="/event"], a[href*="/calendar"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
    categoryMapping: {
      fitness: "Sports",
      sports: "Sports",
      recreation: "Recreation",
      family: "Family",
      outdoor: "Outdoor",
      workshop: "Workshop",
      class: "Class",
    },
  },
];

// Specialized crawler for social media event discovery
export const socialMediaEventSources = [
  {
    name: "Instagram DC Events",
    baseUrl: "https://www.instagram.com",
    hashtags: [
      "#dcevents",
      "#washingtondc",
      "#dcevent",
      "#dcfestival",
      "#dcmusic",
      "#dctheater",
      "#dcfood",
      "#dcart",
    ],
    selectors: {
      eventContainer: '.post-item, [class*="post"]',
      title: ".caption, .text, .description",
      image: "img",
      date: "time, .timestamp",
      location: ".location, .geotag",
    },
  },
  {
    name: "Twitter DC Events",
    baseUrl: "https://twitter.com",
    hashtags: [
      "#DCEvents",
      "#WashingtonDC",
      "#DCEvent",
      "#DCFestival",
      "#DCMusic",
      "#DCTheater",
      "#DCFood",
      "#DCArt",
    ],
    selectors: {
      eventContainer: '.tweet, [class*="tweet"]',
      title: ".tweet-text, .text",
      date: "time, .timestamp",
      location: ".location, .geotag",
    },
  },
];

// Configuration for automated crawling schedules
export const crawlingSchedule = {
  // Crawl major sources daily
  daily: [
    "DC Government Events",
    "Smithsonian Events",
    "Kennedy Center Events",
  ],
  // Crawl secondary sources weekly
  weekly: [
    "DC Theater Scene",
    "Washington Post Going Out Guide",
    "DCist Events",
    "Washingtonian Events",
  ],
  // Crawl niche sources monthly
  monthly: [
    "National Park Service DC Events",
    "Capital Bikeshare Events",
    "DC Department of Parks and Recreation",
  ],
  // Social media sources - crawl every few hours
  frequent: ["Instagram DC Events", "Twitter DC Events"],
};

// Rate limiting and politeness settings
export const crawlerSettings = {
  // Delay between requests to be respectful
  requestDelay: 2000, // 2 seconds
  // Maximum concurrent requests
  maxConcurrent: 3,
  // User agent to identify the crawler
  userAgent: "TouchGrass DC Event Crawler (https://touchgrassdc.com)",
  // Respect robots.txt
  respectRobotsTxt: true,
  // Maximum pages to crawl per source
  maxPagesPerSource: 10,
  // Timeout for page loads
  pageTimeout: 30000, // 30 seconds
  // Retry failed requests
  maxRetries: 3,
  // Retry delay
  retryDelay: 5000, // 5 seconds
};
