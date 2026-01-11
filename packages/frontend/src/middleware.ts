import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Safely get fullUrl, fallback to pathname if request.url is undefined
  const fullUrl = request.url || request.nextUrl.toString();

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

      // Safely construct the analytics URL using nextUrl which is always available
      let analyticsUrl: URL;
      try {
        // Use nextUrl.origin to construct absolute URL
        analyticsUrl = new URL("/api/analytics/track", request.nextUrl.origin);
      } catch (urlError) {
        console.error("Failed to construct analytics URL:", urlError);
        // If URL construction fails, skip analytics tracking
        return NextResponse.next();
      }

      // Safely get header values and ensure they're valid strings
      const userAgent = request.headers.get("user-agent");
      const referer = request.headers.get("referer");
      const ip =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip");

      // Sanitize values to prevent JSON issues
      const sanitizeString = (
        value: string | null | undefined
      ): string | undefined => {
        if (!value) return undefined;
        // Remove any control characters and ensure valid UTF-8
        return (
          String(value)
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
            .trim() || undefined
        );
      };

      // Use pathname instead of fullUrl to avoid issues with query params and special chars
      const pageUrl = pathname || "/";

      const body = {
        pk: "ANALYTICS#USER_VISIT",
        sk: `TIME#${Date.now()}`,
        properties: {
          page: sanitizeString(pageUrl) || "/",
          fullUrl: sanitizeString(fullUrl) || pageUrl, // Keep fullUrl separate for reference
          timestamp: new Date().toISOString(),
          ...(userAgent ? { userAgent: sanitizeString(userAgent) } : {}),
          ...(referer ? { referer: sanitizeString(referer) } : {}),
          ...(ip ? { ip: sanitizeString(ip) } : {}),
        },
        action: pathname === "/" ? "USER_VISIT" : "USER_ACTION",
      };

      // Validate JSON can be stringified before sending
      let bodyString: string;
      try {
        bodyString = JSON.stringify(body);

        // Validate the JSON is parseable (catches circular refs, etc.)
        try {
          const parsed = JSON.parse(bodyString);
          // Log the body being sent for debugging (first 500 chars)
          if (bodyString.length > 0) {
            console.log("Sending analytics body:", {
              length: bodyString.length,
              preview: bodyString.substring(
                0,
                Math.min(500, bodyString.length)
              ),
              parsedKeys: Object.keys(parsed),
            });
          }
        } catch (validateError) {
          console.error("Generated invalid JSON in middleware:", {
            error:
              validateError instanceof Error
                ? validateError.message
                : String(validateError),
            bodyPreview: bodyString.substring(0, 300),
            bodyLength: bodyString.length,
            originalBody: body,
            charAt222: bodyString[222] || "N/A",
            contextAround222: bodyString.substring(
              Math.max(0, 222 - 50),
              Math.min(bodyString.length, 222 + 50)
            ),
          });
          // Don't send invalid JSON
          return NextResponse.next();
        }
      } catch (stringifyError) {
        console.error(
          "Failed to stringify analytics body:",
          stringifyError,
          body
        );
        return NextResponse.next();
      }

      // Fire-and-forget; include internal secret if configured to bypass protection
      try {
        const urlString = analyticsUrl.toString();
        if (!urlString || urlString === "undefined" || urlString === "null") {
          console.error("Invalid analytics URL, skipping fetch:", urlString);
          return NextResponse.next();
        }

        fetch(urlString, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // mark as internal so middleware ignores this request
            "x-analytics-internal": "1",
            ...(secret ? { "x-internal-secret": secret } : {}),
          },
          body: bodyString,
        }).catch((fetchError) => {
          // Log fetch errors but don't throw
          console.error("Failed to send analytics event:", fetchError);
        });
      } catch (fetchSetupError) {
        console.error("Failed to setup analytics fetch:", fetchSetupError);
        // Don't block the request if analytics fails
      }
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
