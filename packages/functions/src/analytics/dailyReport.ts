import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const SENDER_EMAIL = "hi@touchgrassdc.com";
const ADMIN_EMAILS = ["hi@touchgrassdc.com", "hello@touchgrassdc.com"];

// ── Types ──

interface AnalyticsRecord {
  page: string;
  ip: string;
  userAgent: string;
  referer: string;
  timestamp: string;
  fullUrl?: string;
}

interface DailyStats {
  date: string;
  uniqueVisitors: number;
  totalHits: number;
  topPages: Array<{ page: string; hits: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
}

interface WeeklyTrend {
  thisWeekAvg: number;
  lastWeekAvg: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
}

interface Warning {
  level: "danger" | "warning" | "info";
  message: string;
}

// ── Date utilities (Eastern timezone) ──

function getEasternDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function getEasternMidnightMs(daysAgo: number): number {
  // Get "now" in Eastern, set to midnight, subtract days, convert back to UTC ms
  const now = new Date();
  const easternStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const eastern = new Date(easternStr);
  eastern.setHours(0, 0, 0, 0);
  eastern.setDate(eastern.getDate() - daysAgo);

  // Compute offset between UTC and our Eastern date
  const utcMidnight = new Date(
    eastern.getFullYear(),
    eastern.getMonth(),
    eastern.getDate()
  );
  // Eastern is UTC-5 (EST) or UTC-4 (EDT). Use Intl to get exact offset.
  const utcStr = utcMidnight.toLocaleString("en-US", { timeZone: "UTC" });
  const estStr = utcMidnight.toLocaleString("en-US", { timeZone: "America/New_York" });
  const diff = new Date(utcStr).getTime() - new Date(estStr).getTime();

  return utcMidnight.getTime() + diff;
}

function getYesterdayLabel(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return getEasternDateString(yesterday);
}

// ── DynamoDB query ──

async function queryAnalyticsRange(
  startMs: number,
  endMs: number
): Promise<AnalyticsRecord[]> {
  const records: AnalyticsRecord[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new QueryCommand({
      TableName: Resource.Db.name,
      KeyConditionExpression: "pk = :pk AND sk BETWEEN :skStart AND :skEnd",
      ExpressionAttributeValues: {
        ":pk": { S: "ANALYTICS#USER_VISIT" },
        ":skStart": { S: `TIME#${startMs}` },
        ":skEnd": { S: `TIME#${endMs}` },
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await dynamoClient.send(command);

    for (const item of result.Items || []) {
      const unmarshalled = unmarshall(item);
      const props = unmarshalled.properties as any;
      if (props) {
        records.push({
          page: props.page || "",
          ip: props.ip || "",
          userAgent: props.userAgent || "",
          referer: props.referer || "",
          timestamp: props.timestamp || "",
          fullUrl: props.fullUrl || "",
        });
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return records;
}

// ── Aggregation ──

function normalizePage(page: string): string {
  try {
    const url = new URL(page, "https://touchgrassdc.com");
    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return page || "/";
  }
}

function computeDailyStats(records: AnalyticsRecord[], dateLabel: string): DailyStats {
  const uniqueIPs = new Set<string>();
  const pageCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();

  for (const record of records) {
    if (record.ip && record.ip.trim()) uniqueIPs.add(record.ip);

    const page = normalizePage(record.page);
    pageCounts.set(page, (pageCounts.get(page) || 0) + 1);

    if (
      record.referer &&
      !record.referer.includes("touchgrassdc.com") &&
      record.referer.trim()
    ) {
      referrerCounts.set(record.referer, (referrerCounts.get(record.referer) || 0) + 1);
    }
  }

  const topPages = Array.from(pageCounts.entries())
    .map(([page, hits]) => ({ page, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10);

  const topReferrers = Array.from(referrerCounts.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    date: dateLabel,
    uniqueVisitors: uniqueIPs.size,
    totalHits: records.length,
    topPages,
    topReferrers,
  };
}

function groupByDayUniqueIPs(records: AnalyticsRecord[]): number[] {
  const ipsByDay = new Map<string, Set<string>>();

  for (const record of records) {
    if (!record.ip || !record.ip.trim()) continue;
    const date = record.timestamp
      ? getEasternDateString(new Date(record.timestamp))
      : "unknown";
    if (date === "unknown") continue;
    if (!ipsByDay.has(date)) ipsByDay.set(date, new Set());
    ipsByDay.get(date)!.add(record.ip);
  }

  return Array.from(ipsByDay.values()).map((ips) => ips.size);
}

function computeWeeklyTrend(
  thisWeekRecords: AnalyticsRecord[],
  lastWeekRecords: AnalyticsRecord[]
): WeeklyTrend {
  const thisWeekDaily = groupByDayUniqueIPs(thisWeekRecords);
  const lastWeekDaily = groupByDayUniqueIPs(lastWeekRecords);

  const thisWeekAvg =
    thisWeekDaily.length > 0
      ? thisWeekDaily.reduce((a, b) => a + b, 0) / thisWeekDaily.length
      : 0;
  const lastWeekAvg =
    lastWeekDaily.length > 0
      ? lastWeekDaily.reduce((a, b) => a + b, 0) / lastWeekDaily.length
      : 0;

  let percentChange = 0;
  let direction: "up" | "down" | "flat" = "flat";

  if (lastWeekAvg > 0) {
    percentChange = ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100;
    direction = percentChange > 5 ? "up" : percentChange < -5 ? "down" : "flat";
  } else if (thisWeekAvg > 0) {
    direction = "up";
    percentChange = 100;
  }

  return {
    thisWeekAvg: Math.round(thisWeekAvg * 10) / 10,
    lastWeekAvg: Math.round(lastWeekAvg * 10) / 10,
    percentChange: Math.round(percentChange * 10) / 10,
    direction,
  };
}

// ── Warnings ──

const SUSPICIOUS_REFERRER_PATTERNS = [
  "semalt.com",
  "buttons-for-website.com",
  "makemoneyonline",
  "best-seo",
  "free-social-buttons",
  "darodar.com",
  "ilovevitaly.com",
];

function detectWarnings(
  stats: DailyStats,
  trend: WeeklyTrend,
  yesterdayRecords: AnalyticsRecord[]
): Warning[] {
  const warnings: Warning[] = [];

  // Zero traffic
  if (stats.uniqueVisitors === 0) {
    warnings.push({
      level: "danger",
      message:
        "Zero visitors yesterday! Check if the site is down or analytics tracking is broken.",
    });
  }

  // Large traffic drop
  if (trend.direction === "down" && trend.percentChange < -30) {
    warnings.push({
      level: "danger",
      message: `Traffic dropped ${Math.abs(trend.percentChange)}% compared to the previous week.`,
    });
  }

  // Suspicious referrers
  const suspicious = stats.topReferrers.filter((r) =>
    SUSPICIOUS_REFERRER_PATTERNS.some((p) => r.referrer.toLowerCase().includes(p))
  );
  if (suspicious.length > 0) {
    warnings.push({
      level: "warning",
      message: `Suspicious referrer(s): ${suspicious.map((r) => r.referrer).join(", ")}`,
    });
  }

  // Bot detection: single IP > 50% of traffic
  if (stats.totalHits > 10) {
    const ipCounts = new Map<string, number>();
    for (const r of yesterdayRecords) {
      if (r.ip) ipCounts.set(r.ip, (ipCounts.get(r.ip) || 0) + 1);
    }
    for (const [ip, count] of ipCounts) {
      if (count / stats.totalHits > 0.5) {
        warnings.push({
          level: "warning",
          message: `Single IP ${ip} generated ${count}/${stats.totalHits} hits (${Math.round((count / stats.totalHits) * 100)}% of traffic) — possible bot.`,
        });
        break;
      }
    }
  }

  return warnings;
}

// ── Email HTML ──

function buildReportEmail(
  stats: DailyStats,
  trend: WeeklyTrend,
  warnings: Warning[]
): string {
  const trendArrow =
    trend.direction === "up"
      ? "&#9650;"
      : trend.direction === "down"
        ? "&#9660;"
        : "&#9644;";
  const trendColor =
    trend.direction === "up"
      ? "#10b981"
      : trend.direction === "down"
        ? "#ef4444"
        : "#a0aec0";

  const warningsHtml =
    warnings.length > 0
      ? warnings
          .map((w) => {
            const bg = w.level === "danger" ? "#7f1d1d" : "#78350f";
            const border = w.level === "danger" ? "#ef4444" : "#f59e0b";
            return `<tr><td style="padding:8px 12px;background:${bg};border-left:3px solid ${border};border-radius:4px;font-size:13px;color:#fef2f2;">&#9888; ${w.message}</td></tr>`;
          })
          .join('<tr><td style="height:4px"></td></tr>')
      : '<tr><td style="padding:8px 12px;background:#064e3b;border-left:3px solid #10b981;border-radius:4px;font-size:13px;color:#d1fae5;">&#10003; All clear &mdash; no warnings today.</td></tr>';

  const topPagesHtml = stats.topPages
    .map(
      (p, i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #2d3748;font-size:13px;color:#a0aec0;width:30px">${i + 1}.</td><td style="padding:6px 8px;border-bottom:1px solid #2d3748;font-size:13px;color:#e2e8f0">${p.page}</td><td style="padding:6px 8px;border-bottom:1px solid #2d3748;font-size:13px;color:#f7fafc;text-align:right;font-weight:600">${p.hits}</td></tr>`
    )
    .join("");

  const referrersHtml =
    stats.topReferrers.length > 0
      ? stats.topReferrers
          .map(
            (r) =>
              `<tr><td style="padding:4px 8px;font-size:12px;color:#a0aec0;border-bottom:1px solid #2d3748">${r.referrer.length > 60 ? r.referrer.substring(0, 60) + "..." : r.referrer}</td><td style="padding:4px 8px;font-size:12px;color:#e2e8f0;text-align:right;border-bottom:1px solid #2d3748">${r.count}</td></tr>`
          )
          .join("")
      : '<tr><td colspan="2" style="padding:4px 8px;font-size:12px;color:#718096">No external referrers yesterday</td></tr>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1a202c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a202c">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

<!-- Header -->
<tr><td style="padding:24px;text-align:center">
  <h1 style="margin:0;font-size:24px;color:#10b981">TouchGrass DC</h1>
  <p style="margin:8px 0 0;font-size:14px;color:#a0aec0">Daily Analytics Report &mdash; ${stats.date}</p>
</td></tr>

<!-- Key Metrics -->
<tr><td style="padding:0 24px 24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="8">
  <tr>
    <td style="width:33%;text-align:center;padding:16px;background:#2d3748;border-radius:8px">
      <p style="margin:0;font-size:28px;font-weight:700;color:#f7fafc">${stats.uniqueVisitors}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#a0aec0">Unique Visitors</p>
    </td>
    <td style="width:33%;text-align:center;padding:16px;background:#2d3748;border-radius:8px">
      <p style="margin:0;font-size:28px;font-weight:700;color:#f7fafc">${trend.thisWeekAvg}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#a0aec0">7-Day Avg</p>
    </td>
    <td style="width:33%;text-align:center;padding:16px;background:#2d3748;border-radius:8px">
      <p style="margin:0;font-size:28px;font-weight:700;color:${trendColor}">${trendArrow} ${Math.abs(trend.percentChange)}%</p>
      <p style="margin:4px 0 0;font-size:12px;color:#a0aec0">vs Prev Week</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Alerts -->
<tr><td style="padding:0 24px 16px">
  <h2 style="margin:0 0 8px;font-size:16px;color:#f7fafc">Alerts</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="4">${warningsHtml}</table>
</td></tr>

<!-- Top Pages -->
<tr><td style="padding:0 24px 16px">
  <h2 style="margin:0 0 8px;font-size:16px;color:#f7fafc">Top Pages Yesterday</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2d3748;border-radius:8px;overflow:hidden">
    <tr><th style="padding:8px;font-size:11px;color:#718096;text-align:left">#</th><th style="padding:8px;font-size:11px;color:#718096;text-align:left">Page</th><th style="padding:8px;font-size:11px;color:#718096;text-align:right">Hits</th></tr>
    ${topPagesHtml}
  </table>
</td></tr>

<!-- Top Referrers -->
<tr><td style="padding:0 24px 16px">
  <h2 style="margin:0 0 8px;font-size:16px;color:#f7fafc">Top Referrers</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2d3748;border-radius:8px;overflow:hidden">
    <tr><th style="padding:8px;font-size:11px;color:#718096;text-align:left">Referrer</th><th style="padding:8px;font-size:11px;color:#718096;text-align:right">Hits</th></tr>
    ${referrersHtml}
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px;text-align:center;border-top:1px solid #2d3748">
  <p style="margin:0;font-size:11px;color:#718096">Automated report from TouchGrass DC &mdash; <a href="https://touchgrassdc.com" style="color:#10b981">touchgrassdc.com</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Main handler ──

export const handler = async () => {
  console.log("Starting daily analytics report");

  try {
    // 1. Single query: last 14 days of analytics
    const startMs = getEasternMidnightMs(14);
    const endMs = Date.now();
    const allRecords = await queryAnalyticsRange(startMs, endMs);
    console.log(`Fetched ${allRecords.length} analytics records (last 14 days)`);

    // 2. Partition by time range
    const yesterdayStartMs = getEasternMidnightMs(1);
    const todayStartMs = getEasternMidnightMs(0);
    const sevenDaysAgoMs = getEasternMidnightMs(7);

    const yesterdayRecords = allRecords.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= yesterdayStartMs && ts < todayStartMs;
    });

    const thisWeekRecords = allRecords.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= sevenDaysAgoMs;
    });

    const lastWeekRecords = allRecords.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts < sevenDaysAgoMs;
    });

    // 3. Compute stats
    const dateLabel = getYesterdayLabel();
    const stats = computeDailyStats(yesterdayRecords, dateLabel);
    const trend = computeWeeklyTrend(thisWeekRecords, lastWeekRecords);
    const warnings = detectWarnings(stats, trend, yesterdayRecords);

    console.log(
      `Yesterday (${dateLabel}): ${stats.uniqueVisitors} unique visitors, ${stats.totalHits} hits`
    );
    console.log(
      `Weekly trend: ${trend.thisWeekAvg} avg (${trend.direction} ${trend.percentChange}%)`
    );
    console.log(`Warnings: ${warnings.length}`);

    // 4. Build and send email
    const html = buildReportEmail(stats, trend, warnings);
    const subject = `TouchGrass DC: ${stats.uniqueVisitors} visitors on ${dateLabel}`;

    let sent = 0;
    for (const recipient of ADMIN_EMAILS) {
      try {
        await sesClient.send(
          new SendEmailCommand({
            Source: SENDER_EMAIL,
            Destination: { ToAddresses: [recipient] },
            Message: {
              Subject: { Data: subject },
              Body: { Html: { Data: html } },
            },
          })
        );
        sent++;
        console.log(`Report sent to ${recipient}`);
      } catch (err) {
        console.error(`Failed to send to ${recipient}:`, err);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        date: dateLabel,
        uniqueVisitors: stats.uniqueVisitors,
        totalHits: stats.totalHits,
        trend,
        warnings: warnings.length,
        sent,
      }),
    };
  } catch (error) {
    console.error("Daily analytics report failed:", error);
    throw error;
  }
};
