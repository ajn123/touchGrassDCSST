// Helper to resolve image URLs for web or static images
// args: [category, title, venue] — used to generate a unique seeded fallback
export function resolveImageUrl(image_url?: string | null, ...args: any[]): string {
  if (!image_url) {
    // Use title (args[1]) or category (args[0]) as a stable per-event seed
    const seed = encodeURIComponent(
      String(args[1] || args[0] || Math.random()).slice(0, 40)
    );
    return `https://picsum.photos/seed/${seed}/400/300`;
  }
  if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
    return image_url; // Web image
  }
  // Static image in public/images/
  return `/images/${image_url.replace(/^\/+/, '')}`;
}

/**
 * Returns true if the image URL should use unoptimized loading
 * (e.g. external URLs that Next.js Image optimization can't handle).
 */
export function shouldBeUnoptimized(url: string): boolean {
  if (!url) return false;
  // External images not in our allowed domains should be unoptimized
  return url.startsWith('http://') || url.startsWith('https://');
}