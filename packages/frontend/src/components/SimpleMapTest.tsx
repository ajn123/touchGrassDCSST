'use client';

import { useEffect, useRef, useState } from 'react';

export default function SimpleMapTest() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const testMap = async () => {
      try {
        setStatus('Checking for Google Maps...');
        
        // Check if Google Maps is already loaded
        if (window.google?.maps) {
          setStatus('Google Maps already loaded');
        } else {
          setStatus('Loading Google Maps script...');
          
          // Check API key
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            setStatus('ERROR: No API key found');
            return;
          }
          
          setStatus(`API key found (${apiKey.length} chars)`);
          
          // Load script
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
          script.async = true;
          
          script.onload = () => {
            setStatus('Script loaded, creating map...');
            
            if (mapRef.current && window.google?.maps) {
              try {
                new window.google.maps.Map(mapRef.current, {
                  center: { lat: 38.9072, lng: -77.0369 },
                  zoom: 10
                });
                setStatus('Map created successfully!');
              } catch (mapError) {
                setStatus(`Map creation failed: ${mapError}`);
              }
            } else {
              setStatus('Map container or Google Maps not available');
            }
          };
          
          script.onerror = () => {
            setStatus('Failed to load Google Maps script');
          };
          
          document.head.appendChild(script);
        }
      } catch (error) {
        setStatus(`Error: ${error}`);
      }
    };

    testMap();
  }, []);

  return (
    <div className="border-2 border-blue-300 p-4 rounded-lg">
      <h3 className="font-bold mb-2">Simple Map Test</h3>
      <p className="text-sm mb-2">Status: {status}</p>
      <div 
        ref={mapRef} 
        className="w-full h-48 bg-gray-100 border border-gray-300"
      />
    </div>
  );
} 