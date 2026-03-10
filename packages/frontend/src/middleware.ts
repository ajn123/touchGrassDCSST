import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function generateVisitorId(): string {
  // Simple UUID v4 generator for edge runtime (no crypto.randomUUID in all runtimes)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function sanitizeString(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const sanitized = String(value)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .trim();
    if (!sanitized) return undefined;
    JSON.parse(JSON.stringify({ test: sanitized }));
    return sanitized;
  } catch {
    return undefined;
  }
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|wget|curl|python|scrapy|headless|phantom|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|fetch|archive|semrush|ahrefs|mj12|dotbot|yandex|baidu|petalbot|bytespider|amazonbot|claudebot|gptbot|chatgpt|anthropic|perplexity|cohere|ai2bot|ccbot|commoncrawl|applebot|duckduck|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|preview|embed|og-|opengraph/i;

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullUrl = request.url || request.nextUrl.toString();

  // ── Persistent visitor ID cookie ──
  const existingVisitorId = request.cookies.get("tg_vid")?.value;
  const visitorId = existingVisitorId || generateVisitorId();
  const isNewVisitor = !existingVisitorId;

  // ── Block exploit probes (PHP, WordPress, etc.) ──
  if (/\.(php|asp|aspx|jsp|cgi|env)$/i.test(pathname) ||
      /^\/wp-(admin|content|includes|login)/i.test(pathname) ||
      /^\/(swagger|actuator|debug|console|\.git|\.env)/i.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── API routes — enforce secret, no cookie needed ──
  if (pathname.startsWith("/api")) {
    const secret = process.env.NEXT_INTERNAL_API_SECRET;
    if (secret && secret.length > 0) {
      const provided = request.headers.get("x-internal-secret");
      if (provided !== secret) {
        return new NextResponse("Not Found", { status: 404 });
      }
    }
    return NextResponse.next();
  }

  // ── Analytics tracking (page views only, skip bots) ──
  try {
    const method = request.method;
    const accept = request.headers.get("accept") || "";
    const isHtmlRequest = accept.includes("text/html");
    const isInternalAnalytics =
      request.headers.get("x-analytics-internal") === "1";
    const userAgent = request.headers.get("user-agent");

    if (method === "GET" && isHtmlRequest && !isInternalAnalytics && !isBot(userAgent)) {
      const secret = process.env.NEXT_INTERNAL_API_SECRET;
      const analyticsUrl = new URL("/api/analytics/track", request.nextUrl.origin);

      const pageUrl = pathname || "/";
      const properties: Record<string, string> = {
        page: sanitizeString(pageUrl) || "/",
        timestamp: new Date().toISOString(),
        visitorId,
      };

      const sanitizedFullUrl = sanitizeString(fullUrl);
      if (sanitizedFullUrl && sanitizedFullUrl !== pageUrl) {
        properties.fullUrl = sanitizedFullUrl;
      }

      const sanitizedUserAgent = sanitizeString(request.headers.get("user-agent"));
      if (sanitizedUserAgent) properties.userAgent = sanitizedUserAgent;

      const sanitizedReferer = sanitizeString(request.headers.get("referer"));
      if (sanitizedReferer) properties.referer = sanitizedReferer;

      const sanitizedIp = sanitizeString(
        request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")
      );
      if (sanitizedIp) properties.ip = sanitizedIp;

      const body = {
        pk: "ANALYTICS#USER_VISIT",
        sk: `TIME#${Date.now()}`,
        properties,
        action: pathname === "/" ? "USER_VISIT" : "USER_ACTION",
      };

      try {
        const bodyString = JSON.stringify(body);
        JSON.parse(bodyString); // validate

        fetch(analyticsUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-analytics-internal": "1",
            ...(secret ? { "x-internal-secret": secret } : {}),
          },
          body: bodyString,
        }).catch(() => {});
      } catch {
        // Skip analytics if serialization fails
      }
    }
  } catch {
    // Swallow analytics errors
  }

  // ── Build response and set visitor cookie ──
  const response = NextResponse.next();

  if (isNewVisitor) {
    response.cookies.set("tg_vid", visitorId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
