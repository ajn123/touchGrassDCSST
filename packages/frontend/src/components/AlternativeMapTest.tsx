'use client';

import { useEffect, useRef, useState } from 'react';

export default function AlternativeMapTest() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Loading...');

  useEffect(() => {
    const loadMap = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setStatus('No API key');
        return;
      }

      // Try loading with a different approach
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Define the callback function
      (window as any).initMap = () => {
        try {
          if (mapRef.current && (window as any).google?.maps) {
            new (window as any).google.maps.Map(mapRef.current, {
              center: { lat: 38.9072, lng: -77.0369 },
              zoom: 10
            });
            setStatus('Map loaded successfully!');
          } else {
            setStatus('Container or Google Maps not available');
          }
        } catch (error) {
          setStatus(`Error: ${error}`);
        }
      };
      
      script.onerror = () => {
        setStatus('Script failed to load');
      };
      
      document.head.appendChild(script);
    };

    loadMap();
  }, []);

  return (
    <div className="border-2 border-purple-300 p-4 rounded-lg">
      <h3 className="font-bold mb-2">Alternative Map Test (Callback Method)</h3>
      <p className="text-sm mb-2">Status: {status}</p>
      <div 
        ref={mapRef} 
        className="w-full h-48 bg-gray-100 border border-gray-300"
      />
    </div>
  );
} 