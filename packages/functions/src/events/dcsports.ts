import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

// ESPN public API endpoints for DC sports teams (no API key needed)
const DC_TEAMS = [
  {
    name: "Washington Wizards",
    sport: "Basketball",
    venue: "Capital One Arena",
    venueAddress: "601 F St NW, Washington, DC 20004",
    endpoint:
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/wsh/schedule",
  },
  {
    name: "Washington Capitals",
    sport: "Hockey",
    venue: "Capital One Arena",
    venueAddress: "601 F St NW, Washington, DC 20004",
    endpoint:
      "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/wsh/schedule",
  },
  {
    name: "Washington Nationals",
    sport: "Baseball",
    venue: "Nationals Park",
    venueAddress: "1500 South Capitol St SE, Washington, DC 20003",
    endpoint:
      "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/wsh/schedule",
  },
  {
    name: "Washington Commanders",
    sport: "Football",
    venue: "Northwest Stadium",
    venueAddress: "1600 FedEx Way, Landover, MD 20785",
    endpoint:
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/wsh/schedule",
  },
  {
    name: "D.C. United",
    sport: "Soccer",
    venue: "Audi Field",
    venueAddress: "100 Potomac Ave SW, Washington, DC 20024",
    endpoint:
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/193/schedule",
  },
];

const MAX_EVENTS = 50;

/**
 * Convert a UTC ISO date string to Eastern date (YYYY-MM-DD) and time (h:mm AM/PM).
 */
export function parseESPNDate(utcDateStr: string): {
  date: string;
  time: string;
} {
  const d = new Date(utcDateStr);
  if (isNaN(d.getTime())) return { date: "", time: "" };

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    date: dateFormatter.format(d), // "2026-03-15"
    time: timeFormatter.format(d), // "7:30 PM"
  };
}

/**
 * Build a human-readable game title like "Wizards vs. Lakers" or "Nationals at Dodgers".
 */
export function buildGameTitle(
  teamName: string,
  competitors: any[]
): { title: string; isHome: boolean } {
  if (!competitors || competitors.length < 2) {
    return { title: teamName, isHome: true };
  }

  // Find our team and the opponent
  const homeTeam = competitors.find((c: any) => c.homeAway === "home");
  const awayTeam = competitors.find((c: any) => c.homeAway === "away");

  if (!homeTeam || !awayTeam) {
    return { title: teamName, isHome: true };
  }

  const homeName =
    homeTeam.team?.shortDisplayName || homeTeam.team?.displayName || "Home";
  const awayName =
    awayTeam.team?.shortDisplayName || awayTeam.team?.displayName || "Away";

  // Determine if we're the home team by matching the team name
  const isHome = (homeTeam.team?.displayName || "").includes(
    teamName.split(" ").pop() || ""
  );

  if (isHome) {
    return { title: `${homeName} vs. ${awayName}`, isHome: true };
  } else {
    return { title: `${awayName} at ${homeName}`, isHome: false };
  }
}

/**
 * Parse ESPN API response into normalized event objects.
 */
export function parseESPNSchedule(
  data: any,
  team: (typeof DC_TEAMS)[number]
): any[] {
  const events: any[] = [];

  if (!data?.events || !Array.isArray(data.events)) return events;

  for (const game of data.events) {
    // Skip completed games
    const competition = game.competitions?.[0];
    if (competition?.status?.type?.completed) continue;

    // Skip games with no date
    if (!game.date) continue;

    const { date, time } = parseESPNDate(game.date);
    if (!date) continue;

    const { title, isHome } = buildGameTitle(
      team.name,
      competition?.competitors
    );

    // Only include home games (games in DC area)
    if (!isHome) continue;

    // Get venue from the game data, or fall back to the team's default venue
    const gameVenue = competition?.venue?.fullName || team.venue;
    const gameAddress = competition?.venue?.address
      ? `${competition.venue.address.city || ""}, ${competition.venue.address.state || ""}`.trim()
      : team.venueAddress;

    // Get broadcast info for description
    const broadcasts = competition?.broadcasts
      ?.map((b: any) => b.media?.shortName)
      .filter(Boolean)
      .join(", ");

    const seasonType = game.seasonType?.name || "";
    const description = [
      `${team.sport} — ${team.name}`,
      seasonType ? `${seasonType}` : "",
      broadcasts ? `TV: ${broadcasts}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    // Get ESPN game link
    const gameLink = game.links?.find(
      (l: any) => l.text === "Gamecast" || l.text === "Summary"
    );
    const url =
      gameLink?.href || `https://www.espn.com/${team.sport.toLowerCase()}`;

    events.push({
      title,
      date,
      time,
      location: gameAddress,
      venue: isHome ? gameVenue : gameVenue,
      category: "Sports",
      description,
      url,
      image_url: undefined,
    });
  }

  return events;
}

export const handler: Handler = async () => {
  console.log("DC Sports handler started");

  try {
    const allEvents: any[] = [];

    const failedTeams: string[] = [];

    for (const team of DC_TEAMS) {
      console.log(`Fetching schedule for ${team.name}...`);

      let success = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(team.endpoint);
          if (!response.ok) {
            throw new Error(`ESPN API error: ${response.status}`);
          }

          const data = await response.json();
          const events = parseESPNSchedule(data, team);
          console.log(`Found ${events.length} upcoming games for ${team.name}`);
          allEvents.push(...events);
          success = true;
          break;
        } catch (error) {
          if (attempt < 2) {
            console.warn(`Attempt ${attempt}/2 failed for ${team.name}, retrying in 1s...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            console.error(`Failed to fetch ${team.name} schedule after 2 attempts:`, error);
            failedTeams.push(team.name);
          }
        }
      }

      // Small delay between teams
      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (failedTeams.length > 0) {
      console.error(JSON.stringify({
        error: `ESPN fetch failed for teams: ${failedTeams.join(", ")}`,
        context: { failedTeams, totalTeams: DC_TEAMS.length },
        timestamp: new Date().toISOString(),
      }));
    }

    // Sort by date and limit
    allEvents.sort((a, b) => a.date.localeCompare(b.date));
    const events = allEvents.slice(0, MAX_EVENTS);

    console.log(
      `Total: ${allEvents.length} upcoming games, sending ${events.length} to normalization`
    );

    if (events.length === 0) {
      console.log("No upcoming games found");
      return { statusCode: 200, body: "No upcoming games" };
    }

    // Send to Step Functions for normalization
    const client = new SFNClient({});
    const executionName = `dcsports-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = JSON.stringify({
      events,
      source: "dcsports",
      eventType: "dcsports",
    });

    // Batch if payload exceeds 256KB
    const MAX_PAYLOAD_SIZE = 256 * 1024;
    if (payload.length > MAX_PAYLOAD_SIZE) {
      const batchSize = Math.floor(
        events.length / Math.ceil(payload.length / MAX_PAYLOAD_SIZE)
      );
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const batchPayload = JSON.stringify({
          events: batch,
          source: "dcsports",
          eventType: "dcsports",
        });
        const batchName = `dcsports-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.send(
          new StartExecutionCommand({
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchPayload,
            name: batchName,
          })
        );
        console.log(
          `Batch ${Math.floor(i / batchSize) + 1} sent (${batch.length} events)`
        );
      }
    } else {
      await client.send(
        new StartExecutionCommand({
          stateMachineArn: Resource.normaizeEventStepFunction.arn,
          input: payload,
          name: executionName,
        })
      );
    }

    console.log(
      `DC Sports handler completed. ${events.length} games sent to normalization.`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "DC Sports events processed",
        total: events.length,
      }),
    };
  } catch (error) {
    console.error(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      context: { handler: "dcsports" },
      timestamp: new Date().toISOString(),
    }));
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
