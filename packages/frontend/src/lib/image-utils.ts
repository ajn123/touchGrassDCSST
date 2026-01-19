// Helper to resolve image URLs for web or static images
export function resolveImageUrl(image_url?: string | null): string | null {
  if (!image_url) return 'https://picsum.photos/200/100.jpg';
  if (image_url.startsWith('http://') || image_url.startsWith('https://')) {
    return image_url; // Web image
  }
  // Static image in public/images/
  return `/images/${image_url.replace(/^\/+/, '')}`;
} 