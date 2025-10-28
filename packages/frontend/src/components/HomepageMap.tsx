"use client";

import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { useEffect, useRef, useState } from "react";

interface Event {
  pk: string;
  title: string;
  description?: string;
  location?: string;
  coordinates?: string;
  cost?: any;
  category?: string;
  date?: string;
}

interface HomepageMapProps {
  className?: string;
}

export default function HomepageMap({ className = "" }: HomepageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [infoWindows, setInfoWindows] = useState<any[]>([]);

  // Fetch events with location data
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Fetch only events with location data using OpenSearch for better performance
        const response = await fetch(
          "/api/search-opensearch?types=event&isPublic=true&limit=100"
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Filter events that have either coordinates or location
        const eventsWithLocation = data.events.filter(
          (event: Event) => event.coordinates || event.location
        );

        console.log(
          `📍 Found ${eventsWithLocation.length} events with location data`
        );
        setEvents(eventsWithLocation);
      } catch (error) {
        // console.error("Error fetching events:", error);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Initialize map and add markers
  useEffect(() => {
    if (!mapRef.current || events.length === 0) return;

    const initializeMap = async () => {
      try {
        await loadGoogleMaps();

        if (!mapRef.current) return;

        // Calculate map bounds based on event locations
        const bounds = new (window.google as any).maps.LatLngBounds();
        let hasValidCoordinates = false;

        // First pass: collect valid coordinates for bounds
        events.forEach((event) => {
          if (event.coordinates) {
            const [latStr, lngStr] = event.coordinates
              .split(",")
              .map((coord) => coord.trim());
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);

            if (!isNaN(lat) && !isNaN(lng)) {
              bounds.extend({ lat, lng });
              hasValidCoordinates = true;
            }
          }
        });

        // Default to DC if no valid coordinates
        const center = hasValidCoordinates
          ? bounds.getCenter()
          : { lat: 38.9072, lng: -77.0369 };
        const zoom = hasValidCoordinates ? 12 : 10;

        const mapInstance = new (window.google as any).maps.Map(
          mapRef.current,
          {
            center,
            zoom,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          }
        );

        // Set bounds if we have valid coordinates
        if (hasValidCoordinates) {
          mapInstance.fitBounds(bounds);
          // Add some padding to the bounds
          mapInstance.setZoom(Math.min(mapInstance.getZoom() || 12, 15));
        }

        setMap(mapInstance);

        // Create markers for each event
        const newMarkers: any[] = [];
        const newInfoWindows: any[] = [];

        events.forEach((event, index) => {
          if (event.coordinates) {
            const [latStr, lngStr] = event.coordinates
              .split(",")
              .map((coord) => coord.trim());
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);

            if (!isNaN(lat) && !isNaN(lng)) {
              // Create marker
              const marker = new (window.google as any).maps.Marker({
                position: { lat, lng },
                map: mapInstance,
                title: event.title,
                animation: (window.google as any).maps.Animation.DROP,
                // Custom marker icon (optional)
                icon: {
                  url:
                    "data:image/svg+xml;charset=UTF-8," +
                    encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#3B82F6"/>
                    </svg>
                  `),
                  scaledSize: new (window.google as any).maps.Size(24, 24),
                  anchor: new (window.google as any).maps.Point(12, 24),
                },
              });

              // Create info window
              const infoWindow = new (window.google as any).maps.InfoWindow({
                content: `
                  <div style="padding: 12px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1F2937;">
                      ${event.title}
                    </h3>
                    ${
                      event.description
                        ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280; line-height: 1.4;">${event.description}</p>`
                        : ""
                    }
                    ${
                      event.location
                        ? `<p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;"><strong>📍</strong> ${event.location}</p>`
                        : ""
                    }
                    ${
                      event.date
                        ? `<p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;"><strong>📅</strong> ${event.date}</p>`
                        : ""
                    }
                    ${
                      event.category
                        ? `<p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;"><strong>🏷️</strong> ${event.category}</p>`
                        : ""
                    }
                    ${
                      event.cost
                        ? `<p style="margin: 0; font-size: 13px; color: #374151;"><strong>💰</strong> ${
                            typeof event.cost === "object"
                              ? event.cost.amount
                              : event.cost
                          }</p>`
                        : ""
                    }
                  </div>
                `,
                maxWidth: 300,
              });

              // Add click listener to marker
              marker.addListener("click", () => {
                // Close all other info windows
                newInfoWindows.forEach((iw) => iw.close());
                // Open this info window
                infoWindow.open(mapInstance, marker);
              });

              newMarkers.push(marker);
              newInfoWindows.push(infoWindow);
            }
          }
        });

        setMarkers(newMarkers);
        setInfoWindows(newInfoWindows);

        console.log(`🗺️ Map initialized with ${newMarkers.length} markers`);
      } catch (error) {
        console.error("Error initializing map:", error);
        setError("Failed to load map");
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      // Clear markers and info windows
      markers.forEach((marker) => marker.setMap(null));
      infoWindows.forEach((infoWindow) => infoWindow.close());
    };
  }, [events]);

  if (loading) {
    return (
      <div
        className={`${className} flex items-center justify-center h-96 bg-gray-100 rounded-lg`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${className} flex items-center justify-center h-96 bg-red-50 rounded-lg`}
      >
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading map</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className={`${className} flex items-center justify-center h-96 bg-gray-100 rounded-lg`}
      >
        <div className="text-center">
          <p className="text-gray-600">No events with location data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Events Map</h2>
        <p className="text-gray-600">
          Discover {events.length} events happening around DC
        </p>
      </div>

      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg shadow-lg border border-gray-200"
        style={{ minHeight: "384px" }}
      />

      <div className="mt-4 text-sm text-gray-500">
        <p>💡 Click on any marker to see event details</p>
        <p>🗺️ Use the map controls to zoom and navigate</p>
      </div>
    </div>
  );
}
