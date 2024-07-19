'use client';

import { useEffect, useRef, useState } from 'react';

export default function DetailedMapTest() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(`[DetailedMapTest] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const testMap = async () => {
      addLog('Starting detailed map test...');
      
      // Step 1: Check API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      addLog(`API Key check: ${apiKey ? 'Present' : 'Missing'} (${apiKey?.length || 0} chars)`);
      
      if (!apiKey) {
        addLog('ERROR: No API key available');
        return;
      }

      // Step 2: Check if Google Maps is already loaded
      if (window.google?.maps) {
        addLog('Google Maps already loaded in window object');
      } else {
        addLog('Google Maps not found in window object, loading script...');
        
        // Step 3: Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          addLog('Google Maps script loaded successfully');
          
          // Step 4: Check if Google Maps is now available
          if (window.google?.maps) {
            addLog('Google Maps API is now available');
            
            // Step 5: Check map container
            if (mapRef.current) {
              addLog('Map container found, attempting to create map...');
              
              try {
                const map = new window.google.maps.Map(mapRef.current, {
                  center: { lat: 38.9072, lng: -77.0369 },
                  zoom: 10,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false
                });
                
                addLog('Map created successfully!');
                
                // Step 6: Test marker creation
                try {
                  const marker = new window.google.maps.Marker({
                    position: { lat: 38.9072, lng: -77.0369 },
                    map: map,
                    title: 'Test Marker'
                  });
                  addLog('Marker created successfully!');
                } catch (markerError) {
                  addLog(`Marker creation failed: ${markerError}`);
                }
                
              } catch (mapError) {
                addLog(`Map creation failed: ${mapError}`);
              }
            } else {
              addLog('ERROR: Map container not found');
            }
          } else {
            addLog('ERROR: Google Maps API still not available after script load');
          }
        };
        
        script.onerror = (error) => {
          addLog(`ERROR: Failed to load Google Maps script: ${error}`);
        };
        
        addLog('Appending script to document head...');
        document.head.appendChild(script);
      }
    };

    testMap();
  }, []);

  return (
    <div className="border-2 border-green-300 p-4 rounded-lg">
      <h3 className="font-bold mb-2">Detailed Map Test</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Test Logs:</h4>
        <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-48 bg-gray-100 border border-gray-300"
      />
      
      <div className="mt-2 text-xs text-gray-600">
        <p>Container dimensions: {mapRef.current ? `${mapRef.current.offsetWidth}x${mapRef.current.offsetHeight}` : 'Not rendered'}</p>
        <p>Google Maps available: {window.google?.maps ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
} 