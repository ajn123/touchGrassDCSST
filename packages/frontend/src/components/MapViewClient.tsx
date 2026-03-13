"use client";

import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { getCategoryAccent, CATEGORY_ACCENT } from "@/components/EventCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

interface MapEvent {
  pk?: string;
  title?: string;
  description?: string;
  location?: string;
  venue?: string;
  coordinates?: string;
  cost?: any;
  category?: string | string[];
  start_date?: string;
  start_time?: string;
  url?: string;
  image_url?: string;
}

interface MapViewClientProps {
  events: MapEvent[];
  categories: string[];
}

function parseCoordinates(coords: string): { lat: number; lng: number } | null {
  const [latStr, lngStr] = coords.split(",").map((c) => c.trim());
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function createMarkerIcon(category?: string | string[]): any {
  const color = getCategoryAccent(category);
  const svg = `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new (window.google as any).maps.Size(28, 40),
    anchor: new (window.google as any).maps.Point(14, 40),
  };
}

function createInfoContent(event: MapEvent): string {
  const accent = getCategoryAccent(event.category);
  const primaryCat = Array.isArray(event.category) ? event.category[0] : event.category || "";
  const displayDate = event.start_date
    ? new Date(event.start_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  const displayVenue = event.venue || event.location || "";

  return `<div style="padding:12px;max-width:280px;font-family:system-ui,sans-serif;">
    <div style="border-left:3px solid ${accent};padding-left:10px;">
      <h3 style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1F2937;">${event.title || "Event"}</h3>
      ${displayDate ? `<p style="margin:0 0 4px;font-size:13px;color:${accent};font-weight:500;">${displayDate}${event.start_time ? " at " + event.start_time : ""}</p>` : ""}
      ${displayVenue ? `<p style="margin:0 0 4px;font-size:13px;color:#6B7280;">${displayVenue}</p>` : ""}
      ${primaryCat ? `<span style="display:inline-block;background:${accent}20;color:${accent};font-size:11px;padding:2px 8px;border-radius:12px;font-weight:500;">${primaryCat}</span>` : ""}
    </div>
    ${event.url ? `<a href="${event.url}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:8px;font-size:13px;color:#2563EB;text-decoration:none;font-weight:500;">More info &rarr;</a>` : ""}
  </div>`;
}

export default function MapViewClient({ events, categories }: MapViewClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<any>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Category filter
      if (selectedCategories.length > 0) {
        const cats = Array.isArray(event.category)
          ? event.category
          : [event.category || ""];
        if (!cats.some((c) => selectedCategories.includes(c))) return false;
      }
      // Date filter
      if (dateRange.start && event.start_date && event.start_date < dateRange.start) return false;
      if (dateRange.end && event.start_date && event.start_date > dateRange.end) return false;
      return true;
    });
  }, [events, selectedCategories, dateRange]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (!mapRef.current) return;

        const mapInstance = new (window.google as any).maps.Map(mapRef.current, {
          center: { lat: 38.9072, lng: -77.0369 },
          zoom: 12,
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
        });

        mapInstanceRef.current = mapInstance;
        infoWindowRef.current = new (window.google as any).maps.InfoWindow();
        setMapReady(true);
      } catch {
        // Map failed to load
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Update markers when filtered events or map changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    const newMarkers: any[] = [];
    const bounds = new (window.google as any).maps.LatLngBounds();
    let hasMarkers = false;

    for (const event of filteredEvents) {
      if (!event.coordinates) continue;
      const pos = parseCoordinates(event.coordinates);
      if (!pos) continue;

      const marker = new (window.google as any).maps.Marker({
        position: pos,
        title: event.title,
        icon: createMarkerIcon(event.category),
      });

      marker.addListener("click", () => {
        infoWindowRef.current.setContent(createInfoContent(event));
        infoWindowRef.current.open(map, marker);
      });

      newMarkers.push(marker);
      bounds.extend(pos);
      hasMarkers = true;
    }

    // Set up clusterer with zoom cap to prevent over-zooming
    clustererRef.current = new MarkerClusterer({
      map,
      markers: newMarkers,
      onClusterClick: (event: any, cluster: any, map: any) => {
        const currentZoom = map.getZoom() || 12;
        const newZoom = Math.min(currentZoom + 2, 15);
        map.setCenter(cluster.position);
        map.setZoom(newZoom);
      },
    });

    markersRef.current = newMarkers;

    // Fit bounds if markers exist
    if (hasMarkers) {
      map.fitBounds(bounds);
      const listener = (window.google as any).maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() > 15) map.setZoom(15);
      });
    }
  }, [filteredEvents, mapReady]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setDateRange({ start: "", end: "" });
  }, []);

  const hasActiveFilters = selectedCategories.length > 0 || dateRange.start || dateRange.end;

  return (
    <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 56px)" }}>
      {/* Mobile filter toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-20 px-4 py-3 rounded-full shadow-lg font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="bg-white text-emerald-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
            {selectedCategories.length + (dateRange.start || dateRange.end ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-72 xl:w-80 transition-transform duration-200 overflow-y-auto border-r`}
        style={{
          backgroundColor: "var(--bg-primary, #fff)",
          borderColor: "var(--border-color, #e5e7eb)",
        }}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Event Map</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </div>

        {/* Category filters */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Categories
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              const color = CATEGORY_ACCENT[cat] || "#10B981";
              const count = events.filter((e) => {
                const c = Array.isArray(e.category) ? e.category[0] : e.category;
                return c === cat;
              }).length;

              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                    isSelected ? "font-medium" : ""
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${color}15` : "transparent",
                    color: "var(--text-primary)",
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color,
                      opacity: isSelected ? 1 : 0.5,
                    }}
                  />
                  <span className="flex-1 truncate">{cat}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Date Range
          </h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border text-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <div className="p-4">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-red-50 text-red-600 border-red-200"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Map container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: "var(--bg-primary, #fff)" }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
