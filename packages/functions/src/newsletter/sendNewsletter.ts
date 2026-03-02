import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const SENDER_EMAIL = "hi@touchgrassdc.com";
const SITE_URL = "https://touchgrassdc.com";

interface NewsletterContent {
  subject: string;
  intro: string;
  topPicks: { title: string; blurb: string; date: string; location: string }[];
  categoryHighlights: { category: string; count: number; teaser: string }[];
  signoff: string;
}

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = Resource.OPENROUTER_API_KEY.value;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function fetchUpcomingEvents() {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Query public events using the publicEventsIndex GSI
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: Resource.Db.name,
      IndexName: "publicEventsIndex",
      KeyConditionExpression: "isPublic = :pub",
      FilterExpression:
        "begins_with(pk, :eventPrefix) AND start_date >= :startDate AND start_date <= :endDate",
      ExpressionAttributeValues: {
        ":pub": { S: "true" },
        ":eventPrefix": { S: "EVENT" },
        ":startDate": { S: now.toISOString().split("T")[0] },
        ":endDate": { S: nextWeek.toISOString().split("T")[0] },
      },
    })
  );

  return (result.Items || []).map((item) => ({
    title: item.title?.S || "Untitled",
    description: item.description?.S || "",
    start_date: item.start_date?.S || "",
    start_time: item.start_time?.S || "",
    location: item.location?.S || "",
    venue: item.venue?.S || "",
    category: item.category?.S || "General",
    url: item.url?.S || "",
    cost: item.cost?.M
      ? {
          type: item.cost.M.type?.S || "unknown",
          amount: item.cost.M.amount?.S || item.cost.M.amount?.N || "0",
        }
      : null,
  }));
}

async function composeNewsletter(events: any[]): Promise<NewsletterContent> {
  if (events.length === 0) {
    return {
      subject: "This Week in DC - TouchGrass Weekly",
      intro: "It's a quieter week in the District, but that doesn't mean there's nothing to do! Keep an eye on touchgrassdc.com for new events as they're added.",
      topPicks: [],
      categoryHighlights: [],
      signoff: "Get out there and touch some grass, DC!",
    };
  }

  const eventSummaries = events
    .slice(0, 30)
    .map(
      (e) =>
        `- ${e.title} | ${e.start_date} ${e.start_time} | ${e.venue || e.location} | Category: ${e.category}`
    )
    .join("\n");

  const prompt = `You are the newsletter writer for TouchGrass DC, a fun event discovery platform for Washington, DC. Write a weekly newsletter based on these upcoming events.

EVENTS:
${eventSummaries}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "subject": "catchy email subject line (under 60 chars)",
  "intro": "2-3 sentence intro paragraph, conversational and energetic",
  "topPicks": [up to 5 objects with "title", "blurb" (1 sentence why it's worth going), "date", "location"],
  "categoryHighlights": [objects with "category", "count" (number of events), "teaser" (1 sentence summary)],
  "signoff": "fun closing line"
}`;

  const aiResponse = await callOpenRouter(prompt);

  // Parse the JSON, stripping any markdown fences if present
  const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

function buildEmailHtml(
  content: NewsletterContent,
  unsubscribeUrl: string
): string {
  const topPicksHtml = content.topPicks
    .map(
      (pick) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #2d3748;">
          <h3 style="margin: 0 0 4px; font-size: 16px; color: #f7fafc;">${pick.title}</h3>
          <p style="margin: 0 0 4px; font-size: 13px; color: #a0aec0;">${pick.date} &bull; ${pick.location}</p>
          <p style="margin: 0; font-size: 14px; color: #e2e8f0;">${pick.blurb}</p>
        </td>
      </tr>`
    )
    .join("");

  const categoryHtml = content.categoryHighlights
    .map(
      (cat) => `
      <td style="padding: 8px 12px; background-color: #2d3748; border-radius: 8px; margin: 4px;">
        <p style="margin: 0; font-size: 13px; color: #10b981; font-weight: 600;">${cat.category} (${cat.count})</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">${cat.teaser}</p>
      </td>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #1a202c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a202c;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: #10b981;">TouchGrass DC</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #a0aec0;">Your weekly guide to what's happening in DC</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #e2e8f0;">${content.intro}</p>
            </td>
          </tr>

          ${
            content.topPicks.length > 0
              ? `<!-- Top Picks -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; color: #10b981;">Top Picks This Week</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${topPicksHtml}
              </table>
            </td>
          </tr>`
              : ""
          }

          ${
            content.categoryHighlights.length > 0
              ? `<!-- Category Highlights -->
          <tr>
            <td style="padding: 16px 24px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; color: #10b981;">By Category</h2>
              <table role="presentation" cellpadding="0" cellspacing="8">
                <tr>${categoryHtml}</tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- CTA -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <a href="${SITE_URL}" style="display: inline-block; padding: 12px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Explore All Events</a>
            </td>
          </tr>

          <!-- Signoff -->
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #a0aec0; font-style: italic;">${content.signoff}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; border-top: 1px solid #2d3748;">
              <p style="margin: 0; font-size: 12px; color: #718096;">
                You're receiving this because you subscribed at touchgrassdc.com.<br>
                <a href="${unsubscribeUrl}" style="color: #718096; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function fetchActiveSubscribers() {
  const items: any[] = [];
  let lastKey: any = undefined;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "begins_with(pk, :prefix) AND #status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":prefix": { S: "SUBSCRIBER#" },
          ":active": { S: "active" },
        },
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items.map((item) => ({
    email: item.email?.S || "",
    unsubscribeToken: item.unsubscribeToken?.S || "",
  }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const handler = async () => {
  console.log("Starting weekly newsletter send");

  try {
    // 1. Fetch upcoming events
    const events = await fetchUpcomingEvents();
    console.log(`Found ${events.length} upcoming events`);

    // 2. Compose newsletter via AI
    const content = await composeNewsletter(events);
    console.log(`Newsletter composed: "${content.subject}"`);

    // 3. Fetch active subscribers
    const subscribers = await fetchActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log("No active subscribers, skipping send");
      return { statusCode: 200, body: "No subscribers" };
    }

    // 4. Send emails with throttling
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i];
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;
      const html = buildEmailHtml(content, unsubscribeUrl);

      try {
        await sesClient.send(
          new SendEmailCommand({
            Source: SENDER_EMAIL,
            Destination: { ToAddresses: [subscriber.email] },
            Message: {
              Subject: { Data: content.subject },
              Body: { Html: { Data: html } },
            },
          })
        );
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${subscriber.email}:`, err);
        failed++;
      }

      // Throttle: pause every 10 emails to respect SES rate limits
      if ((i + 1) % 10 === 0 && i + 1 < subscribers.length) {
        await sleep(1000);
      }
    }

    console.log(
      `Newsletter send complete: ${sent} sent, ${failed} failed out of ${subscribers.length}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, failed, total: subscribers.length }),
    };
  } catch (error) {
    console.error("Newsletter send failed:", error);
    throw error;
  }
};
