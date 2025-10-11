"use client";

import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { useEffect, useRef, useState } from "react";

interface EventMapProps {
  coordinates?: string; // "latitude,longitude" format
  address?: string;
  eventTitle?: string;
  className?: string;
}

export default function EventMap({
  coordinates,
  address,
  eventTitle,
  className = "",
}: EventMapProps) {
  // Don't render if no location data is available
  if (!coordinates && !address) {
    return null;
  }
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(`[EventMap Debug] ${info}`);
    setDebugInfo((prev) => [...prev, info]);
  };

  useEffect(() => {
    addDebugInfo(
      `Component mounted with coordinates: ${coordinates}, address: ${address}`
    );

    // Use shared Google Maps loader
    const initializeMap = async () => {
      try {
        addDebugInfo("Loading Google Maps using shared loader...");
        await loadGoogleMaps();
        addDebugInfo("Google Maps loaded successfully via shared loader");

        if (!mapRef.current) {
          addDebugInfo("ERROR: mapRef.current is null");
          setError("Map container not found");
          return;
        }

        addDebugInfo("Map container found, parsing coordinates...");

        let lat = 38.9072; // Default to DC coordinates
        let lng = -77.0369;

        // Parse coordinates if provided
        if (coordinates) {
          addDebugInfo(`Parsing coordinates: ${coordinates}`);
          const [latStr, lngStr] = coordinates
            .split(",")
            .map((coord) => coord.trim());
          const parsedLat = parseFloat(latStr);
          const parsedLng = parseFloat(lngStr);

          addDebugInfo(`Parsed lat: ${parsedLat}, lng: ${parsedLng}`);

          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
            addDebugInfo(`Using parsed coordinates: ${lat}, ${lng}`);
          } else {
            addDebugInfo("Invalid coordinates, using defaults");
          }
        } else {
          addDebugInfo("No coordinates provided, using defaults");
        }

        addDebugInfo("Creating Google Maps instance...");

        const mapInstance = new (window.google as any).maps.Map(
          mapRef.current,
          {
            center: { lat, lng },
            zoom: coordinates ? 15 : 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          }
        );

        addDebugInfo("Google Maps instance created successfully");
        setMap(mapInstance);

        // Add marker if coordinates are provided
        if (coordinates && !isNaN(lat) && !isNaN(lng)) {
          addDebugInfo("Adding marker to map...");

          const markerInstance = new (window.google as any).maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            title: eventTitle || "Event Location",
            animation: (window.google as any).maps.Animation.DROP,
          });

          setMarker(markerInstance);
          addDebugInfo("Marker added successfully");

          // Add info window
          const infoWindow = new (window.google as any).maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 4px 0; font-size: 14px;">${
                  eventTitle || "Event Location"
                }</h3>
                ${
                  address
                    ? `<p style="margin: 0; font-size: 12px; color: #666;">${address}</p>`
                    : ""
                }
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">${lat.toFixed(
                  6
                )}, ${lng.toFixed(6)}</p>
              </div>
            `,
          });

          markerInstance.addListener("click", () => {
            infoWindow.open(mapInstance, markerInstance);
          });

          addDebugInfo("Info window configured");
        } else {
          addDebugInfo("No marker added (no valid coordinates)");
        }

        addDebugInfo("Map initialization completed successfully");
      } catch (err) {
        addDebugInfo(
          `ERROR: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        console.error("Error initializing map:", err);
        setError("Failed to load map");
      }
    };

    initializeMap();
  }, [coordinates, address, eventTitle]);

  if (error) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <a
        className="button-blue mb-10"
        href={(() => {
          if (address) {
            // Use address if available - more reliable for navigation
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              address
            )}`;
          } else if (coordinates) {
            // Use coordinates with better formatting
            const [lat, lng] = coordinates
              .split(",")
              .map((coord) => coord.trim());
            return `https://www.google.com/maps?q=${lat},${lng}`;
          }
          // Fallback to DC coordinates
          return "https://www.google.com/maps?q=38.9072,-77.0369";
        })()}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Google Maps
      </a>
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg shadow-md mt-2"
        style={{ minHeight: "256px", marginTop: "10px" }}
      />

      {/* Debug info panel */}
      {process.env.NODE_ENV === "development" && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-gray-500">Debug Info</summary>
          <div className="mt-1 text-gray-600 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
            {debugInfo.map((info, index) => (
              <div key={index} className="mb-1">
                {info}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
