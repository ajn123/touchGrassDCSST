import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle homepage visits
  if (pathname === "/") {
    // Example: Add custom headers for homepage
    const response = NextResponse.next();
    response.headers.set("x-homepage-visit", "true");

    // Example: Track homepage visits
    console.log("Homepage visited:", {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ip: request.ip || request.headers.get("x-forwarded-for"),
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

  // Handle API routes
  if (pathname.startsWith("/api")) {
    // Add API-specific headers
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
