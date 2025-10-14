import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullUrl = request.url;

  // Server-side page visit tracking (centralized)
  try {
    const method = request.method;
    const accept = request.headers.get("accept") || "";
    const isHtmlRequest = accept.includes("text/html");
    const isApi = pathname.startsWith("/api");
    const isAnalyticsEndpoint = pathname.startsWith("/api/analytics/track");
    const isInternalAnalytics =
      request.headers.get("x-analytics-internal") === "1";

    // Only track real page views (GET HTML requests), skip APIs/assets/our own analytics calls
    if (
      method === "GET" &&
      isHtmlRequest &&
      !isApi &&
      !isAnalyticsEndpoint &&
      !isInternalAnalytics
    ) {
      const secret = process.env.NEXT_INTERNAL_API_SECRET;
      const analyticsUrl = new URL("/api/analytics/track", request.url);
      const body = {
        pk: "ANALYTICS#USER_VISIT",
        sk: `TIME#${Date.now()}`,
        properties: {
          page: fullUrl,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get("user-agent") || undefined,
          referer: request.headers.get("referer") || undefined,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            undefined,
        },
        action: pathname === "/" ? "USER_VISIT" : "USER_ACTION",
      };

      // Fire-and-forget; include internal secret if configured to bypass protection
      fetch(analyticsUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // mark as internal so middleware ignores this request
          "x-analytics-internal": "1",
          ...(secret ? { "x-internal-secret": secret } : {}),
        },
        body: JSON.stringify(body),
      }).catch(() => {});
    }
  } catch (_) {
    // swallow analytics errors to avoid impacting requests
  }

  // Handle homepage visits
  if (pathname === "/") {
    console.log("Homepage visited");
    // Example: Add custom headers for homepage
    const response = NextResponse.next();
    response.headers.set("x-homepage-visit", "true");

    // Example: Track homepage visits
    console.log("Homepage visited:", {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    return response;
  }

  // Handle other routes
  if (pathname.startsWith("/events")) {
    // Add event-specific headers
    const response = NextResponse.next();
    response.headers.set("x-route-type", "events");
    return response;
  }

  // Handle API routes - make private behind shared secret
  if (pathname.startsWith("/api")) {
    const secret = process.env.NEXT_INTERNAL_API_SECRET;

    // If a secret is configured, enforce it via header check
    if (secret && secret.length > 0) {
      const provided = request.headers.get("x-internal-secret");

      if (provided !== secret) {
        // Return 404 to avoid revealing endpoint existence
        return new NextResponse("Not Found", { status: 404 });
      }
    }

    const response = NextResponse.next();
    response.headers.set("x-route-type", "api");
    return response;
  }

  return NextResponse.next();
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
