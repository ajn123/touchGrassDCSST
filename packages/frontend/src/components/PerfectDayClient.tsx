"use client";

import { useState, useCallback } from "react";
import type { Itinerary, ItinerarySlot, PerfectDayPreferences, Vibe } from "@/lib/perfect-day";

const EVENT_CATEGORIES = [
  "Music", "Comedy", "Arts", "Sports", "Community",
  "Theater", "Education", "Outdoors", "Nightlife", "Food & Drink",
];

const SLOT_COLORS: Record<string, string> = {
  morning: "#F59E0B",
  lunch: "#EA580C",
  afternoon: "#2563EB",
  dinner: "#DC2626",
  evening: "#8B5CF6",
  night: "#7C3AED",
};

const SLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  lunch: "Lunch",
  afternoon: "Afternoon",
  dinner: "Dinner",
  evening: "Evening",
  night: "Late Night",
};

const VIBES: { value: Vibe; label: string; emoji: string; desc: string }[] = [
  { value: "chill", label: "Chill", emoji: "😌", desc: "Low-key, no rush" },
  { value: "adventure", label: "Adventure", emoji: "🚀", desc: "Pack it full" },
  { value: "date-night", label: "Date Night", emoji: "💕", desc: "Romantic & intimate" },
  { value: "solo", label: "Solo Explorer", emoji: "🧭", desc: "Just me, myself & DC" },
  { value: "group-hangout", label: "Group Hangout", emoji: "🎉", desc: "Squad outing" },
  { value: "culture-vulture", label: "Culture Vulture", emoji: "🎭", desc: "Museums, art & theater" },
];

const DC_FACTS = [
  "DC has more free museums than any other US city",
  "The National Mall is actually 2x the size of Vatican City",
  "DC residents consume more wine per capita than any US state",
  "There are over 200 embassies and international cultural centers in DC",
  "The Library of Congress has over 170 million items",
  "DC has 74+ farmers markets operating each week",
];

function getNextSaturday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSat = day === 6 ? 0 : (6 - day);
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSat);
  return saturday.toISOString().split("T")[0];
}

export default function PerfectDayClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preferences, setPreferences] = useState<PerfectDayPreferences>({
    date: getNextSaturday(),
    categories: [],
    budget: "any",
  });
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funFact] = useState(() => DC_FACTS[Math.floor(Math.random() * DC_FACTS.length)]);

  const toggleCategory = useCallback((cat: string) => {
    setPreferences((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }, []);

  const generateItinerary = useCallback(async () => {
    setStep(2);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/perfect-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate itinerary");
      }

      const data = await response.json();
      setItinerary(data.itinerary);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep(1);
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  const handleRetake = useCallback(() => {
    setItinerary(null);
    setError(null);
    setStep(1);
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Perfect Day Planner</h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            {step === 1 && "Tell us what you're into and we'll plan your perfect day in DC"}
            {step === 2 && "Crafting your perfect day..."}
            {step === 3 && itinerary?.title}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s <= step ? "w-12" : "w-8"}`}
              style={{
                backgroundColor: s <= step ? "var(--accent-primary, #10b981)" : "var(--bg-secondary, #e5e7eb)",
              }}
            />
          ))}
        </div>

        {/* Step 1: Preferences */}
        {step === 1 && (
          <div>
            {error && (
              <div className="mb-6 p-4 rounded-lg border border-red-300 bg-red-50 text-red-700">
                {error}
              </div>
            )}

            {/* Date Picker */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Pick a date</h2>
              <input
                type="date"
                value={preferences.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setPreferences((prev) => ({ ...prev, date: e.target.value }))}
                className="px-4 py-3 rounded-lg border text-base"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {formatDate(preferences.date)}
              </p>
            </div>

            {/* Category Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">What are you in the mood for?</h2>
              <div className="flex flex-wrap gap-3">
                {EVENT_CATEGORIES.map((cat) => {
                  const isSelected = preferences.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "hover:border-emerald-400 hover:shadow-sm"
                      }`}
                      style={
                        !isSelected
                          ? {
                              backgroundColor: "var(--bg-secondary)",
                              borderColor: "var(--border-color, #d1d5db)",
                              color: "var(--text-primary)",
                            }
                          : undefined
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {preferences.categories.length === 0
                  ? "Leave empty for a mix of everything"
                  : `Selected: ${preferences.categories.join(", ")}`}
              </p>
            </div>

            {/* Vibe Selector */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">What's the vibe?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VIBES.map(({ value, label, emoji, desc }) => {
                  const isSelected = preferences.vibe === value;
                  return (
                    <button
                      key={value}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          vibe: prev.vibe === value ? undefined : value,
                        }))
                      }
                      className={`p-3 rounded-lg text-left transition-all border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "hover:border-emerald-400 hover:shadow-sm"
                      }`}
                      style={
                        !isSelected
                          ? {
                              backgroundColor: "var(--bg-secondary)",
                              borderColor: "var(--border-color, #d1d5db)",
                              color: "var(--text-primary)",
                            }
                          : undefined
                      }
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="ml-2 text-sm font-medium">{label}</span>
                      <p
                        className="text-xs mt-1"
                        style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-secondary)" }}
                      >
                        {desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Free-text Interests */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Anything else we should know?</h2>
              <textarea
                value={preferences.interests || ""}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, interests: e.target.value }))
                }
                placeholder="e.g. &quot;I love jazz and hole-in-the-wall restaurants&quot; or &quot;First time in DC, want iconic spots&quot;"
                rows={3}
                maxLength={300}
                className="w-full px-4 py-3 rounded-lg border text-sm resize-none"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="mt-1 text-xs text-right" style={{ color: "var(--text-secondary)" }}>
                {(preferences.interests || "").length}/300
              </p>
            </div>

            {/* Budget */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Budget</h2>
              <div className="flex gap-3">
                {([
                  { value: "free", label: "Free only" },
                  { value: "moderate", label: "Moderate" },
                  { value: "any", label: "Sky's the limit" },
                ] as const).map(({ value, label }) => {
                  const isSelected = preferences.budget === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setPreferences((prev) => ({ ...prev, budget: value }))}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "hover:border-emerald-400 hover:shadow-sm"
                      }`}
                      style={
                        !isSelected
                          ? {
                              backgroundColor: "var(--bg-secondary)",
                              borderColor: "var(--border-color, #d1d5db)",
                              color: "var(--text-primary)",
                            }
                          : undefined
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={generateItinerary}
                className="px-8 py-4 rounded-lg font-semibold text-lg transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg"
              >
                Plan My Perfect Day
                <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 2 && loading && (
          <div className="text-center py-16">
            <div className="inline-block mb-6">
              <svg className="animate-spin h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Planning your perfect day...</h2>
            <p className="text-base mb-6" style={{ color: "var(--text-secondary)" }}>
              Finding the best events and restaurants for {formatDate(preferences.date)}
            </p>
            <div
              className="max-w-md mx-auto p-4 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Did you know? {funFact}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Itinerary Results */}
        {step === 3 && itinerary && (
          <div>
            {/* Date Banner */}
            <div
              className="text-center mb-8 p-4 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <p className="text-lg font-medium">{formatDate(itinerary.date)}</p>
            </div>

            {/* Slots */}
            <div className="space-y-6">
              {itinerary.slots.map((slot, index) => (
                <SlotCard key={index} slot={slot} index={index} />
              ))}
            </div>

            {/* Tips */}
            {itinerary.tips && (
              <div
                className="mt-8 p-5 rounded-lg border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                }}
              >
                <h3 className="font-semibold mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pro Tips
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>{itinerary.tips}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={generateItinerary}
                className="px-6 py-3 rounded-lg font-semibold transition-all border hover:shadow-md"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color, #d1d5db)",
                  color: "var(--text-primary)",
                }}
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Shuffle
              </button>
              <button
                onClick={handleRetake}
                className="px-6 py-3 rounded-lg font-semibold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotCard({ slot, index }: { slot: ItinerarySlot; index: number }) {
  const color = SLOT_COLORS[slot.timeSlot] || "#64748B";
  const label = SLOT_LABELS[slot.timeSlot] || slot.timeSlot;

  return (
    <div
      className="rounded-xl overflow-hidden border transition-all hover:shadow-lg"
      style={{ borderColor: "var(--border-color, #e5e7eb)" }}
    >
      {/* Colored top bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {label}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {slot.time}
              </span>
              {slot.type === "restaurant" && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Dining
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold">{slot.title}</h3>
            {slot.venue && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {slot.venue}{slot.address ? ` — ${slot.address}` : ""}
              </p>
            )}
          </div>
          {slot.rating && (
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {slot.rating}
            </div>
          )}
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {slot.description}
        </p>

        {(slot.cost || slot.url) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--border-color, #e5e7eb)" }}>
            {slot.cost && (
              <span className="text-sm font-medium" style={{ color }}>
                {slot.cost === "free" ? "Free" : slot.cost.startsWith("$") ? slot.cost : `$${slot.cost}`}
              </span>
            )}
            {slot.url && (
              <a
                href={slot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--accent-primary, #10b981)" }}
              >
                More info &rarr;
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
