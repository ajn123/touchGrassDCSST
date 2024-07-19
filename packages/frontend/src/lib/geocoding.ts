'use server';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    if (!address || !process.env.GOOGLE_MAPS_API_KEY) {
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
} 