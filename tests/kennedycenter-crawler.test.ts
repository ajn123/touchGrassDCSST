import { describe, it, expect } from "vitest";
import {
  parseDate,
  parseTime,
  parsePrice,
  parseISODateToEastern,
  mapCategory,
  KennedyCenterEvent,
} from "../packages/tasks/crawlers/kennedycenter";

describe("Kennedy Center crawler parsing", () => {
  describe("parseDate", () => {
    it("parses full month name with year: 'March 15, 2026'", () => {
      expect(parseDate("March 15, 2026")).toBe("2026-03-15");
    });

    it("parses abbreviated month: 'Mar 15, 2026'", () => {
      expect(parseDate("Mar 15, 2026")).toBe("2026-03-15");
    });

    it("parses full month without comma: 'March 15 2026'", () => {
      expect(parseDate("March 15 2026")).toBe("2026-03-15");
    });

    it("pads single-digit day: 'April 5, 2026'", () => {
      expect(parseDate("April 5, 2026")).toBe("2026-04-05");
    });

    it("parses ISO format: '2026-12-25'", () => {
      expect(parseDate("2026-12-25")).toBe("2026-12-25");
    });

    it("parses ISO embedded in string: 'starts 2026-06-01 at noon'", () => {
      expect(parseDate("starts 2026-06-01 at noon")).toBe("2026-06-01");
    });

    it("returns empty string for empty input", () => {
      expect(parseDate("")).toBe("");
    });

    it("returns empty string for garbage", () => {
      expect(parseDate("no date here")).toBe("");
    });

    it("handles future date without year by using current year", () => {
      // Use a month far in the future to ensure it's always future
      const result = parseDate("December 31");
      expect(result).toMatch(/^\d{4}-12-31$/);
    });

    it("handles all month abbreviations", () => {
      const months = [
        { input: "Jan 1, 2027", expected: "2027-01-01" },
        { input: "Feb 14, 2027", expected: "2027-02-14" },
        { input: "Jun 15, 2027", expected: "2027-06-15" },
        { input: "Jul 4, 2027", expected: "2027-07-04" },
        { input: "Aug 10, 2027", expected: "2027-08-10" },
        { input: "Sep 1, 2027", expected: "2027-09-01" },
        { input: "Oct 31, 2027", expected: "2027-10-31" },
        { input: "Nov 11, 2027", expected: "2027-11-11" },
        { input: "Dec 25, 2027", expected: "2027-12-25" },
      ];
      for (const { input, expected } of months) {
        expect(parseDate(input)).toBe(expected);
      }
    });

    it("trims whitespace", () => {
      expect(parseDate("  March 15, 2026  ")).toBe("2026-03-15");
    });
  });

  describe("parseTime", () => {
    it("parses '7:30 PM'", () => {
      expect(parseTime("7:30 PM")).toBe("7:30pm");
    });

    it("parses '7:30pm' (no space)", () => {
      expect(parseTime("7:30pm")).toBe("7:30pm");
    });

    it("parses '11:00 AM'", () => {
      expect(parseTime("11:00 AM")).toBe("11:00am");
    });

    it("parses '8pm' (no minutes)", () => {
      expect(parseTime("8pm")).toBe("8pm");
    });

    it("converts 24-hour format '19:30' to 12-hour", () => {
      expect(parseTime("19:30")).toBe("7:30pm");
    });

    it("converts '13:00' to '1:00pm'", () => {
      expect(parseTime("13:00")).toBe("1:00pm");
    });

    it("converts '00:30' (midnight) to '12:30am'", () => {
      expect(parseTime("00:30")).toBe("12:30am");
    });

    it("converts '12:00' (noon) to '12:00pm'", () => {
      expect(parseTime("12:00")).toBe("12:00pm");
    });

    it("returns undefined for empty string", () => {
      expect(parseTime("")).toBeUndefined();
    });

    it("returns undefined for non-time string", () => {
      expect(parseTime("not a time")).toBeUndefined();
    });
  });

  describe("parsePrice", () => {
    it("returns 'free' for 'Free'", () => {
      expect(parsePrice("Free")).toBe("free");
    });

    it("returns 'free' for 'free admission'", () => {
      expect(parsePrice("free admission")).toBe("free");
    });

    it("returns 'free' for 'FREE'", () => {
      expect(parsePrice("FREE")).toBe("free");
    });

    it("extracts dollar amount from '$45'", () => {
      expect(parsePrice("$45")).toBe("45");
    });

    it("extracts dollar amount with cents from '$45.00'", () => {
      expect(parsePrice("$45.00")).toBe("45.00");
    });

    it("extracts price from 'Tickets from $25'", () => {
      expect(parsePrice("Tickets from $25")).toBe("25");
    });

    it("extracts price with space: '$ 30'", () => {
      expect(parsePrice("$ 30")).toBe("30");
    });

    it("returns undefined for empty string", () => {
      expect(parsePrice("")).toBeUndefined();
    });

    it("returns undefined for text without price", () => {
      expect(parsePrice("no price info")).toBeUndefined();
    });
  });

  describe("mapCategory", () => {
    it("maps 'comedy' to Comedy", () => {
      expect(mapCategory("comedy")).toBe("Comedy");
    });

    it("maps 'Stand-Up Comedy' to Comedy", () => {
      expect(mapCategory("Stand-Up Comedy")).toBe("Comedy");
    });

    it("maps 'jazz' to Music", () => {
      expect(mapCategory("jazz")).toBe("Music");
    });

    it("maps 'Classical Music' to Music", () => {
      expect(mapCategory("Classical Music")).toBe("Music");
    });

    it("maps 'concert' to Music", () => {
      expect(mapCategory("concert")).toBe("Music");
    });

    it("maps 'orchestra' to Music", () => {
      expect(mapCategory("orchestra")).toBe("Music");
    });

    it("maps 'symphony' to Music", () => {
      expect(mapCategory("symphony")).toBe("Music");
    });

    it("maps 'theater' to Theater", () => {
      expect(mapCategory("theater")).toBe("Theater");
    });

    it("maps 'theatre' to Theater", () => {
      expect(mapCategory("theatre")).toBe("Theater");
    });

    it("maps 'musical' to Theater", () => {
      expect(mapCategory("musical")).toBe("Theater");
    });

    it("maps 'play' to Theater", () => {
      expect(mapCategory("play")).toBe("Theater");
    });

    it("maps 'dance' to Arts", () => {
      expect(mapCategory("dance")).toBe("Arts");
    });

    it("maps 'ballet' to Arts", () => {
      expect(mapCategory("ballet")).toBe("Arts");
    });

    it("maps 'family' to Community", () => {
      expect(mapCategory("family")).toBe("Community");
    });

    it("maps 'kids' to Community", () => {
      expect(mapCategory("kids")).toBe("Community");
    });

    it("maps 'film' to Arts", () => {
      expect(mapCategory("film")).toBe("Arts");
    });

    it("defaults unknown category to Arts", () => {
      expect(mapCategory("something unknown")).toBe("Arts");
    });

    it("is case insensitive", () => {
      expect(mapCategory("COMEDY")).toBe("Comedy");
      expect(mapCategory("Jazz Night")).toBe("Music");
      expect(mapCategory("THEATER")).toBe("Theater");
    });
  });

  describe("parseISODateToEastern", () => {
    it("converts UTC evening to Eastern same day", () => {
      // 11:30 PM UTC = 7:30 PM EST (same day, winter)
      const result = parseISODateToEastern("2026-01-15T23:30:00Z");
      expect(result).not.toBeNull();
      expect(result!.date).toBe("2026-01-15");
      expect(result!.time).toBe("6:30 pm");
    });

    it("converts UTC early morning to Eastern previous day", () => {
      // 1:00 AM UTC = 8:00 PM EST previous day
      const result = parseISODateToEastern("2026-01-16T01:00:00Z");
      expect(result).not.toBeNull();
      expect(result!.date).toBe("2026-01-15");
      expect(result!.time).toBe("8:00 pm");
    });

    it("converts UTC midnight to Eastern previous day", () => {
      // Midnight UTC = 7:00 PM EST previous day
      const result = parseISODateToEastern("2026-03-15T00:00:00Z");
      expect(result).not.toBeNull();
      expect(result!.date).toBe("2026-03-14");
      expect(result!.time).toBe("8:00 pm");
    });

    it("handles EDT (summer time) correctly", () => {
      // 11:30 PM UTC in July = 7:30 PM EDT (UTC-4)
      const result = parseISODateToEastern("2026-07-15T23:30:00Z");
      expect(result).not.toBeNull();
      expect(result!.date).toBe("2026-07-15");
      expect(result!.time).toBe("7:30 pm");
    });

    it("handles afternoon UTC correctly", () => {
      // 6:00 PM UTC = 1:00 PM EST
      const result = parseISODateToEastern("2026-01-15T18:00:00Z");
      expect(result).not.toBeNull();
      expect(result!.date).toBe("2026-01-15");
      expect(result!.time).toBe("1:00 pm");
    });

    it("returns null for invalid date", () => {
      expect(parseISODateToEastern("not-a-date")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseISODateToEastern("")).toBeNull();
    });
  });

  describe("KennedyCenterEvent", () => {
    it("constructs with all fields", () => {
      const event = new KennedyCenterEvent(
        "National Symphony Orchestra",
        "2026-03-15",
        "7:30pm",
        "2700 F Street NW, Washington, DC 20566",
        "An evening of classical music",
        "https://www.kennedy-center.org/whats-on/explore/music/nso",
        "Music",
        "45",
        "Kennedy Center",
        "https://example.com/image.jpg"
      );

      expect(event.title).toBe("National Symphony Orchestra");
      expect(event.date).toBe("2026-03-15");
      expect(event.time).toBe("7:30pm");
      expect(event.location).toBe("2700 F Street NW, Washington, DC 20566");
      expect(event.description).toBe("An evening of classical music");
      expect(event.url).toBe("https://www.kennedy-center.org/whats-on/explore/music/nso");
      expect(event.category).toBe("Music");
      expect(event.price).toBe("45");
      expect(event.venue).toBe("Kennedy Center");
      expect(event.image_url).toBe("https://example.com/image.jpg");
    });

    it("constructs with required fields only", () => {
      const event = new KennedyCenterEvent("Some Show", "2026-04-01");

      expect(event.title).toBe("Some Show");
      expect(event.date).toBe("2026-04-01");
      expect(event.time).toBeUndefined();
      expect(event.location).toBeUndefined();
      expect(event.description).toBeUndefined();
    });
  });
});
