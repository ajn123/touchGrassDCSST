let googleMapsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadGoogleMaps(): Promise<void> {
  // If already loaded, return immediately
  if (googleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if already loaded (in case it was loaded by another component)
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Maps API key not found'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'));
    };
    
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isGoogleMapsLoaded(): boolean {
  return googleMapsLoaded && !!window.google?.maps;
} 