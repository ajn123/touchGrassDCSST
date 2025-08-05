import { NextRequest, NextResponse } from "next/server";
import { client } from "../../../../auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const exchanged = await client.exchange(code!, `${url.origin}/api/callback`);

  if (exchanged.err) return NextResponse.json(exchanged.err, { status: 400 });

  // Redirect to main website with tokens as URL parameters
  const mainWebsiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";
  const redirectUrl = new URL("/", mainWebsiteUrl);
  redirectUrl.searchParams.set("access_token", exchanged.tokens.access);
  redirectUrl.searchParams.set("refresh_token", exchanged.tokens.refresh);

  return NextResponse.redirect(redirectUrl.toString());
}