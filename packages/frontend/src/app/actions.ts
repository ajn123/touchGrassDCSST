"use server";

import { cookies as getCookies, headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { subjects } from "../../../auth/subjects";
import { client, setTokens } from "../../auth";

export async function auth() {
  const cookies = await getCookies();
  const accessToken = cookies.get("access_token");
  const refreshToken = cookies.get("refresh_token");

  if (!accessToken) {
    console.log("Auth check: No access token, returning false");
    return false;
  }

  const verified = await client.verify(subjects, accessToken.value, {
    refresh: refreshToken?.value,
  });

  if (verified.err) {
    return false;
  }
  if (verified.tokens) {
    await setTokens(verified.tokens.access, verified.tokens.refresh);
  }

  return verified.subject;
}

export async function login() {
  const cookies = await getCookies();
  const accessToken = cookies.get("access_token");
  const refreshToken = cookies.get("refresh_token");

  if (accessToken) {
    const verified = await client.verify(subjects, accessToken.value, {
      refresh: refreshToken?.value,
    });
    if (!verified.err && verified.tokens) {
      await setTokens(verified.tokens.access, verified.tokens.refresh);
      redirect("/admin");
    }
  }

  const headers = await getHeaders();
  const host = headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const { url } = await client.authorize(
    `${protocol}://${host}/api/callback`,
    "code"
  );
  redirect(url);
}

export async function logout() {
  const cookies = await getCookies();

  console.log("Logout: Starting logout process...");

  // Check current cookies before clearing
  const accessToken = cookies.get("access_token");

  const refreshToken = cookies.get("refresh_token");
  console.log("Logout: Current access token exists:", !!accessToken);
  console.log("Logout: Current refresh token exists:", !!refreshToken);

  cookies.delete("access_token");
  cookies.delete("refresh_token");

  console.log("Logout: Cookies cleared, redirecting...");

  // Add a small delay to ensure cookies are set before redirect
  await new Promise((resolve) => setTimeout(resolve, 100));

  redirect("/admin");
}
