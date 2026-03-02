import { describe, it, expect } from "vitest";
import {
  transformWashingtonianEvent,
  transformKennedyCenterEvent,
  transformMeetupDCEvent,
  transformCrawlerEvent,
} from "../packages/functions/src/events/normalizeEvents";
import {
  normalizeCategory,
  VALID_CATEGORIES,
} from "../packages/shared-utils/src/index";

describe("Event normalization transforms", () => {
  describe("transformWashingtonianEvent", () => {
    it("normalizes a standard Washingtonian event", () => {
      const raw = {
        title: "Alexandria Cars & Coffee",
        date: "2026-03-01",
        time: "8:30 am",
        location: "Hollin Hall Shopping Center | Alexandria, VA",
        description: "A car meetup in Alexandria",
        url: "https://www.washingtonian.com/calendar-2#/details/example",
        venue: "Hollin Hall Shopping Center",
      };

      const result = transformWashingtonianEvent(raw);

      expect(result.title).toBe("Alexandria Cars & Coffee");
      expect(result.start_date).toBeDefined();
      expect(result.source).toBe("washingtonian");
      expect(result.isPublic).toBe(true);
      expect(result.venue).toBe("Hollin Hall Shopping Center");
      expect(result.location).toBe("Hollin Hall Shopping Center | Alexandria, VA");
    });

    it("handles missing optional fields", () => {
      const raw = {
        title: "Simple Event",
        date: "2026-04-15",
      };

      const result = transformWashingtonianEvent(raw);

      expect(result.title).toBe("Simple Event");
      expect(result.source).toBe("washingtonian");
      expect(result.isPublic).toBe(true);
      expect(result.description).toBeUndefined();
      expect(result.venue).toBeUndefined();
    });

    it("sets socials.website from url", () => {
      const raw = {
        title: "Event with URL",
        date: "2026-03-10",
        url: "https://example.com/event",
      };

      const result = transformWashingtonianEvent(raw);

      expect(result.socials).toEqual({ website: "https://example.com/event" });
    });

    it("does not set socials when url is missing", () => {
      const raw = {
        title: "Event without URL",
        date: "2026-03-10",
      };

      const result = transformWashingtonianEvent(raw);

      expect(result.socials).toBeUndefined();
    });
  });

  describe("transformKennedyCenterEvent", () => {
    it("normalizes a Kennedy Center event with all fields", () => {
      const raw = {
        title: "National Symphony Orchestra",
        date: "March 15, 2026",
        time: "7:30 PM",
        location: "2700 F Street NW, Washington, DC 20566",
        venue: "Kennedy Center",
        category: "Music",
        price: "$45",
        description: "An evening of classical music",
        url: "https://www.kennedy-center.org/whats-on/explore/music/nso",
        image_url: "https://example.com/image.jpg",
      };

      const result = transformKennedyCenterEvent(raw);

      expect(result.title).toBe("National Symphony Orchestra");
      expect(result.source).toBe("kennedycenter");
      expect(result.isPublic).toBe(true);
      expect(result.venue).toBe("Kennedy Center");
      expect(result.location).toBe("2700 F Street NW, Washington, DC 20566");
      expect(result.image_url).toBe("https://example.com/image.jpg");
    });

    it("defaults location to Kennedy Center address when missing", () => {
      const raw = {
        title: "Some Show",
        date: "2026-04-01",
      };

      const result = transformKennedyCenterEvent(raw);

      expect(result.location).toBe("2700 F Street NW, Washington, DC 20566");
      expect(result.venue).toBe("Kennedy Center");
    });

    it("preserves provided location over default", () => {
      const raw = {
        title: "Millennium Stage",
        date: "2026-04-01",
        location: "Millennium Stage, Kennedy Center",
        venue: "Millennium Stage",
      };

      const result = transformKennedyCenterEvent(raw);

      expect(result.location).toBe("Millennium Stage, Kennedy Center");
      expect(result.venue).toBe("Millennium Stage");
    });
  });

  describe("transformMeetupDCEvent", () => {
    it("normalizes a Meetup DC event", () => {
      const raw = {
        title: "DC Code & Coffee",
        date: "2026-03-08",
        time: "10:00 AM",
        location: "West End Library, Washington DC",
        venue: "West End Library",
        category: "Technology",
        price: "free",
        description: "Code and coffee meetup",
        url: "https://www.meetup.com/dc-code-coffee/events/123",
      };

      const result = transformMeetupDCEvent(raw);

      expect(result.title).toBe("DC Code & Coffee");
      expect(result.source).toBe("meetupdc");
      expect(result.isPublic).toBe(true);
      expect(result.venue).toBe("West End Library");
    });

    it("handles event with minimal fields", () => {
      const raw = {
        title: "Quick Meetup",
        date: "2026-03-15",
      };

      const result = transformMeetupDCEvent(raw);

      expect(result.title).toBe("Quick Meetup");
      expect(result.source).toBe("meetupdc");
      expect(result.isPublic).toBe(true);
    });
  });

  describe("transformCrawlerEvent", () => {
    it("uses start_date when available", () => {
      const raw = {
        title: "Generic Crawled Event",
        start_date: "2026-05-01",
        end_date: "2026-05-02",
        location: "Some Venue, DC",
        venue: "Some Venue",
        category: "Music",
      };

      const result = transformCrawlerEvent(raw);

      expect(result.title).toBe("Generic Crawled Event");
      expect(result.source).toBe("crawler");
      expect(result.isPublic).toBe(true);
    });

    it("falls back to date field when start_date missing", () => {
      const raw = {
        title: "Event with date field",
        date: "2026-06-01",
      };

      const result = transformCrawlerEvent(raw);

      expect(result.title).toBe("Event with date field");
      expect(result.source).toBe("crawler");
    });

    it("preserves socials object when present", () => {
      const raw = {
        title: "Event with socials",
        date: "2026-06-01",
        socials: {
          website: "https://example.com",
          instagram: "https://instagram.com/event",
        },
      };

      const result = transformCrawlerEvent(raw);

      expect(result.socials).toEqual({
        website: "https://example.com",
        instagram: "https://instagram.com/event",
      });
    });
  });
});

describe("normalizeCategory", () => {
  describe("keyword matching", () => {
    it("maps 'art talk' to Arts & Culture", () => {
      expect(normalizeCategory("art talk")).toBe("Arts & Culture");
    });

    it("maps 'beer' to Food & Drink", () => {
      expect(normalizeCategory("beer")).toBe("Food & Drink");
    });

    it("maps 'concert' to Music", () => {
      expect(normalizeCategory("concert")).toBe("Music");
    });

    it("maps 'jazz night' to Music", () => {
      expect(normalizeCategory("jazz night")).toBe("Music");
    });

    it("maps 'comedy' to Comedy", () => {
      expect(normalizeCategory("comedy")).toBe("Comedy");
    });

    it("maps 'stand-up' to Comedy", () => {
      expect(normalizeCategory("stand-up")).toBe("Comedy");
    });

    it("maps 'improv' to Comedy", () => {
      expect(normalizeCategory("improv")).toBe("Comedy");
    });

    it("maps 'hiking' to Outdoors & Recreation", () => {
      expect(normalizeCategory("hiking")).toBe("Outdoors & Recreation");
    });

    it("maps 'workshop' to Education", () => {
      expect(normalizeCategory("workshop")).toBe("Education");
    });

    it("maps 'theater' to Theater", () => {
      expect(normalizeCategory("theater")).toBe("Theater");
    });

    it("maps 'theatre' to Theater", () => {
      expect(normalizeCategory("theatre")).toBe("Theater");
    });

    it("maps 'volunteer' to Community", () => {
      expect(normalizeCategory("volunteer")).toBe("Community");
    });

    it("maps 'happy hour' to Food & Drink", () => {
      expect(normalizeCategory("happy hour")).toBe("Food & Drink");
    });

    it("maps 'bar crawl' to Nightlife", () => {
      expect(normalizeCategory("bar crawl")).toBe("Nightlife");
    });

    it("maps 'yoga' to Sports", () => {
      expect(normalizeCategory("yoga")).toBe("Sports");
    });

    it("maps 'mixer' to Networking", () => {
      expect(normalizeCategory("mixer")).toBe("Networking");
    });
  });

  describe("case insensitivity", () => {
    it("maps 'Birding' to Outdoors & Recreation", () => {
      expect(normalizeCategory("Birding")).toBe("Outdoors & Recreation");
    });

    it("maps 'birding' to Outdoors & Recreation", () => {
      expect(normalizeCategory("birding")).toBe("Outdoors & Recreation");
    });

    it("maps 'MUSIC' to Music", () => {
      expect(normalizeCategory("MUSIC")).toBe("Music");
    });

    it("maps 'Art Exhibit' to Arts & Culture", () => {
      expect(normalizeCategory("Art Exhibit")).toBe("Arts & Culture");
    });
  });

  describe("junk rejection", () => {
    it("maps '250' to General", () => {
      expect(normalizeCategory("250")).toBe("General");
    });

    it("maps 'bad bunny' to General", () => {
      expect(normalizeCategory("bad bunny")).toBe("General");
    });

    it("maps 'Lincoln' to General", () => {
      expect(normalizeCategory("Lincoln")).toBe("General");
    });

    it("maps 'bhm' to General", () => {
      expect(normalizeCategory("bhm")).toBe("General");
    });

    it("maps 'Mardi Gras at Dauphine\\'s (6-10)' to Festival", () => {
      expect(normalizeCategory("Mardi Gras at Dauphine's (6-10)")).toBe(
        "Festival"
      );
    });
  });

  describe("deduplication", () => {
    it("deduplicates ['music', 'concert'] to 'Music'", () => {
      expect(normalizeCategory(["music", "concert"])).toBe("Music");
    });

    it("deduplicates ['art', 'art tour', 'art exhibit'] to 'Arts & Culture'", () => {
      expect(normalizeCategory(["art", "art tour", "art exhibit"])).toBe(
        "Arts & Culture"
      );
    });

    it("keeps distinct categories from ['music', 'food']", () => {
      const result = normalizeCategory(["music", "food"]);
      expect(result).toContain("Music");
      expect(result).toContain("Food & Drink");
    });
  });

  describe("holiday normalization", () => {
    it("maps 'Valentines' to Festival", () => {
      expect(normalizeCategory("Valentines")).toBe("Festival");
    });

    it("maps 'Valentine\\'s Day' to Festival", () => {
      expect(normalizeCategory("Valentine's Day")).toBe("Festival");
    });

    it("maps 'christmas' to Festival", () => {
      expect(normalizeCategory("christmas")).toBe("Festival");
    });

    it("maps 'halloween' to Festival", () => {
      expect(normalizeCategory("halloween")).toBe("Festival");
    });
  });

  describe("edge cases", () => {
    it("returns 'General' for undefined", () => {
      expect(normalizeCategory(undefined)).toBe("General");
    });

    it("returns 'General' for empty string", () => {
      expect(normalizeCategory("")).toBe("General");
    });

    it("returns 'General' for empty array", () => {
      expect(normalizeCategory([])).toBe("General");
    });

    it("drops General when a specific category is also matched", () => {
      const result = normalizeCategory(["xyz-junk", "music"]);
      expect(result).toBe("Music");
    });
  });

  describe("VALID_CATEGORIES", () => {
    it("contains exactly 13 categories", () => {
      expect(VALID_CATEGORIES).toHaveLength(13);
    });

    it("includes General", () => {
      expect(VALID_CATEGORIES).toContain("General");
    });

    it("normalizeCategory always returns values in VALID_CATEGORIES", () => {
      const testInputs = [
        "art",
        "comedy",
        "music",
        "beer",
        "yoga",
        "hiking",
        "theater",
        "festival",
        "workshop",
        "volunteer",
        "mixer",
        "nightlife",
        "250",
        "bad bunny",
        undefined,
        "",
      ];

      const validSet = new Set(VALID_CATEGORIES as readonly string[]);

      for (const input of testInputs) {
        const result = normalizeCategory(input);
        for (const part of result.split(",")) {
          expect(validSet.has(part)).toBe(true);
        }
      }
    });
  });
});
