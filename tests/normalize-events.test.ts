import { describe, it, expect } from "vitest";
import {
  transformWashingtonianEvent,
  transformKennedyCenterEvent,
  transformMeetupDCEvent,
  transformCrawlerEvent,
} from "../packages/functions/src/events/normalizeEvents";

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
