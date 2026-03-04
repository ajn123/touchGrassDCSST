"use client";

import type { QuizPreferences } from "@/lib/groupQuizPreferences";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface StepPreferencesProps {
  preferences: QuizPreferences;
  onPreferencesChange: (prefs: QuizPreferences) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function StepPreferences({
  preferences,
  onPreferencesChange,
  onNext,
  onBack,
  onSkip,
}: StepPreferencesProps) {
  const toggleDay = (day: string) => {
    const days = preferences.scheduleDays.includes(day)
      ? preferences.scheduleDays.filter((d) => d !== day)
      : [...preferences.scheduleDays, day];
    onPreferencesChange({ ...preferences, scheduleDays: days });
  };

  const setQuickDays = (type: "weekdays" | "weekends" | "any") => {
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weekends = ["Saturday", "Sunday"];
    const days =
      type === "weekdays" ? weekdays : type === "weekends" ? weekends : [];
    onPreferencesChange({ ...preferences, scheduleDays: days });
  };

  return (
    <div>
      {/* Schedule days */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">When are you free?</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Select the days you'd prefer to meet up
        </p>

        {/* Quick select */}
        <div className="flex gap-2 mb-4">
          {(["weekdays", "weekends", "any"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setQuickDays(type)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:border-emerald-400"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color, #d1d5db)",
                color: "var(--text-primary)",
              }}
            >
              {type === "weekdays" ? "Weekdays" : type === "weekends" ? "Weekends" : "Clear"}
            </button>
          ))}
        </div>

        {/* Day chips */}
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const isSelected = preferences.scheduleDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "hover:border-emerald-400"
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
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time preference */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">What time works best?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: "morning" as const, label: "Morning", desc: "Before noon" },
            { value: "evening" as const, label: "Evening", desc: "After 5 PM" },
            { value: "none" as const, label: "No preference", desc: "Any time works" },
          ]).map(({ value, label, desc }) => {
            const isSelected = preferences.timePreference === value;
            return (
              <button
                key={value}
                onClick={() =>
                  onPreferencesChange({ ...preferences, timePreference: value })
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                    : "hover:border-emerald-300"
                }`}
                style={
                  !isSelected
                    ? {
                        borderColor: "var(--border-color, #d1d5db)",
                        backgroundColor: "var(--bg-secondary)",
                      }
                    : undefined
                }
              >
                <div className={`font-medium ${isSelected ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                  {label}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost preference */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">What's your budget?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: "free" as const, label: "Free only", desc: "No cost to join" },
            { value: "any" as const, label: "Open to paid", desc: "Doesn't matter" },
            { value: "none" as const, label: "No preference", desc: "Show me everything" },
          ]).map(({ value, label, desc }) => {
            const isSelected = preferences.costPreference === value;
            return (
              <button
                key={value}
                onClick={() =>
                  onPreferencesChange({ ...preferences, costPreference: value })
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                    : "hover:border-emerald-300"
                }`}
                style={
                  !isSelected
                    ? {
                        borderColor: "var(--border-color, #d1d5db)",
                        backgroundColor: "var(--bg-secondary)",
                      }
                    : undefined
                }
              >
                <div className={`font-medium ${isSelected ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                  {label}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ color: "var(--text-primary)" }}
        >
          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <button
          onClick={onSkip}
          className="text-sm underline"
          style={{ color: "var(--text-secondary)" }}
        >
          Skip to results
        </button>

        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
        >
          Show My Matches
          <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
