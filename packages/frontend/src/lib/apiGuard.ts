import { NextResponse } from "next/server";

// Route-level guard for API handlers. Call at the top of GET/POST/etc.
export function requireInternalSecret(req: Request) {
  const secret = process.env.NEXT_INTERNAL_API_SECRET;
  if (!secret || secret.length === 0) return null; // Allow when not configured

  const provided = req.headers.get("x-internal-secret");
  if (provided !== secret) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }
  return null;
}
