const CATEGORY_COLORS: Record<string, string> = {
  "Arts & Culture": "#E11D48",
  Comedy: "#F59E0B",
  Community: "#2563EB",
  Education: "#4338CA",
  Festival: "#CA8A04",
  "Food & Drink": "#EA580C",
  General: "#475569",
  Music: "#7C3AED",
  Networking: "#0D9488",
  Nightlife: "#6D28D9",
  "Outdoors & Recreation": "#16A34A",
  Sports: "#059669",
  Theater: "#DC2626",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (lines.length >= maxLines) break;
    if (current && current.length + 1 + word.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/**
 * Generate a branded SVG data URI placeholder for events without images.
 * Shows the event title, category badge, and venue — much more useful
 * than a random stock photo.
 */
function generateEventPlaceholderDataUri(
  category?: string,
  title?: string,
  venue?: string,
): string {
  const color = CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS["General"];
  const safeTitle = escapeXml(title || "Event");
  const safeCategory = escapeXml(category || "General");
  const safeVenue = escapeXml(venue || "");

  const titleLines = wrapText(safeTitle, 28, 3);
  const lineHeight = 48;
  const titleStartY = 140;

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="40" y="${titleStartY + i * lineHeight}" fill="%23f8fafc" font-family="system-ui,-apple-system,sans-serif" font-size="36" font-weight="700" letter-spacing="-0.5">${line}</text>`,
    )
    .join("");

  const venueY = titleStartY + titleLines.length * lineHeight + 20;
  const venueSvg = safeVenue
    ? `<text x="40" y="${venueY}" fill="%2394a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="18">${escapeXml(wrapText(safeVenue, 40, 1)[0])}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%230f172a"/><stop offset="50%25" stop-color="%231e293b"/><stop offset="100%25" stop-color="%230f172a"/></linearGradient></defs><rect width="800" height="500" fill="url(%23bg)"/><rect x="0" y="0" width="800" height="5" fill="${color}"/><rect x="0" y="495" width="800" height="5" fill="${color}"/><rect x="40" y="52" rx="12" width="${safeCategory.length * 10 + 36}" height="30" fill="${color}" fill-opacity="0.2"/><text x="58" y="73" fill="${color}" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600" letter-spacing="0.5">${safeCategory}</text>${titleSvg}${venueSvg}<text x="40" y="472" fill="%23334155" font-family="system-ui,-apple-system,sans-serif" font-size="14">touchgrassdc.com</text></svg>`;

  return `data:image/svg+xml,${svg}`;
}

// Helper to resolve image URLs for web or static images
// args: [category, title, venue] — used to generate a unique seeded fallback
export function resolveImageUrl(image_url?: string | null, ...args: any[]): string {
  if (!image_url) {
    const category = args[0] as string | undefined;
    const title = args[1] as string | undefined;
    const venue = args[2] as string | undefined;
    return generateEventPlaceholderDataUri(category, title, venue);
  }
  if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
    return image_url; // Web image
  }
  // Static image in public/images/
  return `/images/${image_url.replace(/^\/+/, '')}`;
}

/**
 * Returns true if the image URL should use unoptimized loading
 * (e.g. external URLs or data URIs that Next.js Image optimization can't handle).
 */
export function shouldBeUnoptimized(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}