import { describe, it, expect } from "vitest";
import {
  parseESPNDate,
  buildGameTitle,
  parseESPNSchedule,
} from "../packages/functions/src/events/dcsports";

describe("DC Sports crawler", () => {
  describe("parseESPNDate", () => {
    it("converts UTC ISO date to Eastern date and time", () => {
      // 2026-03-15T23:30:00Z = 7:30 PM ET (EDT)
      const result = parseESPNDate("2026-03-15T23:30:00Z");
      expect(result.date).toBe("2026-03-15");
      expect(result.time).toMatch(/7:30\s*PM/);
    });

    it("handles date that crosses midnight into next day in Eastern", () => {
      // 2026-06-16T03:00:00Z = June 15 at 11:00 PM ET (EDT)
      const result = parseESPNDate("2026-06-16T03:00:00Z");
      expect(result.date).toBe("2026-06-15");
      expect(result.time).toMatch(/11:00\s*PM/);
    });

    it("handles noon UTC", () => {
      // 2026-07-04T16:00:00Z = 12:00 PM ET (EDT)
      const result = parseESPNDate("2026-07-04T16:00:00Z");
      expect(result.date).toBe("2026-07-04");
      expect(result.time).toMatch(/12:00\s*PM/);
    });

    it("handles morning game", () => {
      // 2026-09-13T17:00:00Z = 1:00 PM ET (EDT)
      const result = parseESPNDate("2026-09-13T17:00:00Z");
      expect(result.date).toBe("2026-09-13");
      expect(result.time).toMatch(/1:00\s*PM/);
    });

    it("returns empty strings for invalid date", () => {
      const result = parseESPNDate("not-a-date");
      expect(result.date).toBe("");
      expect(result.time).toBe("");
    });

    it("returns empty strings for empty string", () => {
      const result = parseESPNDate("");
      expect(result.date).toBe("");
      expect(result.time).toBe("");
    });

    it("handles EST (winter) dates correctly", () => {
      // 2026-12-20T00:00:00Z = Dec 19 at 7:00 PM EST
      const result = parseESPNDate("2026-12-20T00:00:00Z");
      expect(result.date).toBe("2026-12-19");
      expect(result.time).toMatch(/7:00\s*PM/);
    });

    it("handles date with milliseconds", () => {
      const result = parseESPNDate("2026-04-10T22:00:00.000Z");
      expect(result.date).toBe("2026-04-10");
      expect(result.time).toMatch(/6:00\s*PM/);
    });
  });

  describe("buildGameTitle", () => {
    it("builds 'Home vs. Away' for home games", () => {
      const competitors = [
        {
          homeAway: "home",
          team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" },
        },
        {
          homeAway: "away",
          team: { displayName: "Los Angeles Lakers", shortDisplayName: "Lakers", abbreviation: "LAL" },
        },
      ];
      const result = buildGameTitle("WSH", competitors);
      expect(result.title).toBe("Wizards vs. Lakers");
      expect(result.isHome).toBe(true);
    });

    it("builds 'Away at Home' for away games", () => {
      const competitors = [
        {
          homeAway: "home",
          team: { displayName: "Boston Celtics", shortDisplayName: "Celtics", abbreviation: "BOS" },
        },
        {
          homeAway: "away",
          team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" },
        },
      ];
      const result = buildGameTitle("WSH", competitors);
      expect(result.title).toBe("Wizards at Celtics");
      expect(result.isHome).toBe(false);
    });

    it("uses displayName if shortDisplayName is missing", () => {
      const competitors = [
        {
          homeAway: "home",
          team: { displayName: "Washington Nationals", abbreviation: "WSH" },
        },
        {
          homeAway: "away",
          team: { displayName: "New York Mets", abbreviation: "NYM" },
        },
      ];
      const result = buildGameTitle("WSH", competitors);
      expect(result.title).toBe("Washington Nationals vs. New York Mets");
      expect(result.isHome).toBe(true);
    });

    it("returns team abbrev when competitors array is empty", () => {
      const result = buildGameTitle("WSH", []);
      expect(result.title).toBe("WSH");
      expect(result.isHome).toBe(true);
    });

    it("returns team abbrev when competitors is undefined", () => {
      const result = buildGameTitle("DC", undefined as any);
      expect(result.title).toBe("DC");
      expect(result.isHome).toBe(true);
    });

    it("returns team abbrev when only one competitor", () => {
      const competitors = [
        {
          homeAway: "home",
          team: { displayName: "Washington Commanders", shortDisplayName: "Commanders", abbreviation: "WSH" },
        },
      ];
      const result = buildGameTitle("WSH", competitors);
      expect(result.title).toBe("WSH");
      expect(result.isHome).toBe(true);
    });

    it("handles missing homeAway fields gracefully", () => {
      const competitors = [
        { team: { displayName: "Team A", shortDisplayName: "A", abbreviation: "TA" } },
        { team: { displayName: "Team B", shortDisplayName: "B", abbreviation: "TB" } },
      ];
      const result = buildGameTitle("TA", competitors);
      expect(result.title).toBe("TA");
      expect(result.isHome).toBe(true);
    });

    it("handles DC United name matching", () => {
      const competitors = [
        {
          homeAway: "home",
          team: { displayName: "D.C. United", shortDisplayName: "D.C. United", abbreviation: "DC" },
        },
        {
          homeAway: "away",
          team: { displayName: "Atlanta United FC", shortDisplayName: "Atlanta United", abbreviation: "ATL" },
        },
      ];
      const result = buildGameTitle("DC", competitors);
      expect(result.title).toBe("D.C. United vs. Atlanta United");
      expect(result.isHome).toBe(true);
    });
  });

  describe("parseESPNSchedule", () => {
    const mockTeam = {
      name: "Washington Wizards",
      espnAbbrev: "WSH",
      sport: "Basketball",
      venue: "Capital One Arena",
      venueAddress: "601 F St NW, Washington, DC 20004",
      endpoint: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/wsh/schedule",
    };

    it("parses a valid ESPN schedule response", () => {
      const data = {
        events: [
          {
            date: "2027-03-15T23:30:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  {
                    homeAway: "home",
                    team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" },
                  },
                  {
                    homeAway: "away",
                    team: { displayName: "Los Angeles Lakers", shortDisplayName: "Lakers", abbreviation: "LAL" },
                  },
                ],
                venue: { fullName: "Capital One Arena" },
                broadcasts: [{ media: { shortName: "ESPN" } }],
              },
            ],
            seasonType: { name: "Regular Season" },
            links: [{ text: "Gamecast", href: "https://www.espn.com/nba/game/_/id/12345" }],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Wizards vs. Lakers");
      expect(events[0].date).toBe("2027-03-15");
      expect(events[0].category).toBe("Sports");
      expect(events[0].venue).toBe("Capital One Arena");
      expect(events[0].url).toBe("https://www.espn.com/nba/game/_/id/12345");
      expect(events[0].description).toContain("Basketball");
      expect(events[0].description).toContain("Regular Season");
      expect(events[0].description).toContain("ESPN");
    });

    it("skips completed games", () => {
      const data = {
        events: [
          {
            date: "2027-01-10T00:00:00Z",
            competitions: [
              {
                status: { type: { completed: true } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Boston Celtics", shortDisplayName: "Celtics", abbreviation: "BOS" } },
                ],
              },
            ],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(0);
    });

    it("skips games with no date", () => {
      const data = {
        events: [
          {
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Celtics", abbreviation: "BOS" } },
                ],
              },
            ],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(0);
    });

    it("returns empty array for null/undefined data", () => {
      expect(parseESPNSchedule(null, mockTeam)).toEqual([]);
      expect(parseESPNSchedule(undefined, mockTeam)).toEqual([]);
      expect(parseESPNSchedule({}, mockTeam)).toEqual([]);
    });

    it("returns empty array for missing events array", () => {
      expect(parseESPNSchedule({ events: null }, mockTeam)).toEqual([]);
      expect(parseESPNSchedule({ events: "not array" }, mockTeam)).toEqual([]);
    });

    it("uses team default venue when game venue is not available", () => {
      const data = {
        events: [
          {
            date: "2027-05-20T22:00:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Miami Heat", shortDisplayName: "Heat", abbreviation: "MIA" } },
                ],
              },
            ],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(1);
      expect(events[0].venue).toBe("Capital One Arena");
      expect(events[0].location).toBe("601 F St NW, Washington, DC 20004");
    });

    it("uses game venue address when available", () => {
      const data = {
        events: [
          {
            date: "2027-04-10T23:00:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Chicago Bulls", shortDisplayName: "Bulls", abbreviation: "CHI" } },
                ],
                venue: {
                  fullName: "United Center",
                  address: { city: "Chicago", state: "IL" },
                },
              },
            ],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(1);
      expect(events[0].venue).toBe("United Center");
      expect(events[0].location).toBe("Chicago, IL");
    });

    it("handles games with no broadcasts", () => {
      const data = {
        events: [
          {
            date: "2027-06-01T20:00:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Nets", shortDisplayName: "Nets", abbreviation: "BKN" } },
                ],
              },
            ],
            seasonType: { name: "Preseason" },
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(1);
      expect(events[0].description).toContain("Preseason");
      expect(events[0].description).not.toContain("TV:");
    });

    it("uses fallback ESPN URL when no Gamecast link", () => {
      const data = {
        events: [
          {
            date: "2027-03-20T23:00:00Z",
            competitions: [
              {
                status: { type: { completed: false } },
                competitors: [
                  { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                  { homeAway: "away", team: { displayName: "Hawks", shortDisplayName: "Hawks", abbreviation: "ATL" } },
                ],
              },
            ],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events).toHaveLength(1);
      expect(events[0].url).toBe("https://www.espn.com/basketball");
    });

    it("parses multiple games from schedule", () => {
      const data = {
        events: [
          {
            date: "2027-03-10T23:00:00Z",
            competitions: [{
              status: { type: { completed: false } },
              competitors: [
                { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                { homeAway: "away", team: { displayName: "Lakers", shortDisplayName: "Lakers", abbreviation: "LAL" } },
              ],
            }],
          },
          {
            date: "2027-03-12T00:00:00Z",
            competitions: [{
              status: { type: { completed: false } },
              competitors: [
                { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                { homeAway: "away", team: { displayName: "Celtics", shortDisplayName: "Celtics", abbreviation: "BOS" } },
              ],
            }],
          },
          {
            date: "2027-03-15T01:00:00Z",
            competitions: [{
              status: { type: { completed: false } },
              competitors: [
                { homeAway: "home", team: { displayName: "Knicks", shortDisplayName: "Knicks", abbreviation: "NYK" } },
                { homeAway: "away", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
              ],
            }],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      // Only home games are included (away games are filtered out)
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe("Wizards vs. Lakers");
      expect(events[1].title).toBe("Wizards vs. Celtics");
    });

    it("sets image_url to undefined", () => {
      const data = {
        events: [
          {
            date: "2027-05-01T20:00:00Z",
            competitions: [{
              status: { type: { completed: false } },
              competitors: [
                { homeAway: "home", team: { displayName: "Washington Wizards", shortDisplayName: "Wizards", abbreviation: "WSH" } },
                { homeAway: "away", team: { displayName: "Pacers", shortDisplayName: "Pacers", abbreviation: "IND" } },
              ],
            }],
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      expect(events[0].image_url).toBeUndefined();
    });

    it("handles missing competition object gracefully", () => {
      const data = {
        events: [
          {
            date: "2027-04-01T20:00:00Z",
          },
        ],
      };

      const events = parseESPNSchedule(data, mockTeam);
      // Should still parse with defaults since date exists and status check is on competition
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("WSH");
    });
  });
});
