export const ADMIN_EMAILS = [
  "hi@touchgrassdc.com",
  "hello@touchgrassdc.com",
  "admin@example.com",
];

/**
 * Check if an email belongs to an admin user.
 * Works with both server components (user.properties.id) and client components (user.email).
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
