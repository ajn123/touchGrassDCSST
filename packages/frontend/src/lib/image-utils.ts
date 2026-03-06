const CATEGORY_COLORS: Record<string, { accent: string; bgFrom: string; bgTo: string }> = {
  "Arts & Culture": { accent: "#E11D48", bgFrom: "#4a0d1a", bgTo: "#1a0a10" },
  Comedy: { accent: "#F59E0B", bgFrom: "#4a3208", bgTo: "#1a1505" },
  Community: { accent: "#2563EB", bgFrom: "#0d1f4a", bgTo: "#080e1a" },
  Education: { accent: "#4338CA", bgFrom: "#1a154a", bgTo: "#0c0a1a" },
  Festival: { accent: "#CA8A04", bgFrom: "#4a3508", bgTo: "#1a1505" },
  "Food & Drink": { accent: "#EA580C", bgFrom: "#4a1e08", bgTo: "#1a0e05" },
  General: { accent: "#475569", bgFrom: "#1e293b", bgTo: "#0f172a" },
  Music: { accent: "#7C3AED", bgFrom: "#2a154a", bgTo: "#120a1a" },
  Networking: { accent: "#0D9488", bgFrom: "#083a36", bgTo: "#051a18" },
  Nightlife: { accent: "#6D28D9", bgFrom: "#25104a", bgTo: "#10081a" },
  "Outdoors & Recreation": { accent: "#16A34A", bgFrom: "#0a3a1a", bgTo: "#051a0d" },
  Sports: { accent: "#059669", bgFrom: "#083a28", bgTo: "#051a14" },
  Theater: { accent: "#DC2626", bgFrom: "#4a0d0d", bgTo: "#1a0808" },
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
  const colors = CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS["General"];
  // Encode # as %23 for use inside data:image/svg+xml URIs
  const color = colors.accent.replace("#", "%23");
  const bgFrom = colors.bgFrom.replace("#", "%23");
  const bgTo = colors.bgTo.replace("#", "%23");
  const safeTitle = escapeXml(title || "Event");
  const safeCategory = escapeXml(category || "General");
  const safeVenue = escapeXml(venue || "");

  const titleLines = wrapText(safeTitle, 14, 3);
  const lineHeight = 78;

  // Vertically center the content block
  const badgeHeight = 44;
  const titleBlockHeight = titleLines.length * lineHeight;
  const venueHeight = safeVenue ? 40 : 0;
  const totalHeight = badgeHeight + 24 + titleBlockHeight + (venueHeight ? 16 + venueHeight : 0);
  const startY = Math.max(60, (500 - totalHeight) / 2);

  const badgeY = startY;
  const titleStartY = badgeY + badgeHeight + 24 + lineHeight * 0.75;
  const venueY = titleStartY + (titleLines.length - 1) * lineHeight + 32;

  const badgeW = safeCategory.length * 18 + 56;
  const badgeSvg = `<rect x="50" y="${badgeY}" rx="26" width="${badgeW}" height="52" fill="%23000000" fill-opacity="0.5"/><rect x="50" y="${badgeY}" rx="26" width="${badgeW}" height="52" fill="${color}" fill-opacity="0.4"/><text x="78" y="${badgeY + 36}" fill="%23ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="30" font-weight="700" letter-spacing="0.5">${safeCategory}</text>`;

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="50" y="${titleStartY + i * lineHeight}" fill="%23f8fafc" font-family="system-ui,-apple-system,sans-serif" font-size="64" font-weight="800" letter-spacing="-1">${line}</text>`,
    )
    .join("");

  const venueSvg = safeVenue
    ? `<text x="50" y="${venueY}" fill="%2394a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="26">${escapeXml(wrapText(safeVenue, 30, 1)[0])}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="${bgFrom}"/><stop offset="50%25" stop-color="${bgTo}"/><stop offset="100%25" stop-color="${bgFrom}"/></linearGradient></defs><rect width="800" height="500" fill="url(%23bg)"/><rect x="0" y="0" width="800" height="6" fill="${color}"/><rect x="0" y="494" width="800" height="6" fill="${color}"/>` +
    `<circle cx="700" cy="100" r="180" fill="${color}" fill-opacity="0.08"/>` +
    `<circle cx="650" cy="400" r="120" fill="${color}" fill-opacity="0.05"/>` +
    `${badgeSvg}${titleSvg}${venueSvg}` +
    `<text x="50" y="470" fill="%23334155" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="500">touchgrassdc.com</text></svg>`;

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