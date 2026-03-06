"use client";

import EventCard from "@/components/EventCard";
import type { Group } from "@/components/GroupsClient";
import type { QuizPreferences } from "@/lib/groupQuizPreferences";
import Link from "next/link";
import { useState } from "react";

interface ScoredGroup {
  group: Group;
  score: number;
  reasons: string[];
}

interface StepResultsProps {
  scoredGroups: ScoredGroup[];
  preferences: QuizPreferences;
  onRetake: () => void;
  onSave: () => void;
}

export default function StepResults({
  scoredGroups,
  preferences,
  onRetake,
  onSave,
}: StepResultsProps) {
  const [saved, setSaved] = useState(false);

  const topMatches = scoredGroups.filter((sg) => sg.score >= 50);
  const moreToExplore = scoredGroups.filter((sg) => sg.score > 0 && sg.score < 50);

  const handleSave = () => {
    onSave();
    setSaved(true);
  };

  return (
    <div>
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        <button
          onClick={handleSave}
          disabled={saved}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            saved
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
          }`}
        >
          {saved ? (
            <>
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Preferences Saved
            </>
          ) : (
            "Save My Preferences"
          )}
        </button>
        <button
          onClick={onRetake}
          className="px-6 py-2.5 rounded-lg font-medium border transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{
            borderColor: "var(--border-color, #d1d5db)",
            color: "var(--text-primary)",
          }}
        >
          Retake Quiz
        </button>
        <Link
          href="/groups"
          className="px-6 py-2.5 rounded-lg font-medium transition-colors text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Browse all groups
        </Link>
      </div>

      {/* Top Matches */}
      {topMatches.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Top Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topMatches.map((sg) => (
              <EventCard
                key={sg.group.pk}
                href={`/groups/${encodeURIComponent(sg.group.title)}`}
                title={sg.group.title}
                imageUrl={sg.group.image_url}
                category={sg.group.category}
                description={sg.group.description}
                venue={sg.group.scheduleLocation}
                badge={`${sg.score}% match`}
                tags={sg.reasons.slice(0, 2)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 mb-8">
          <p className="text-lg mb-2">No strong matches found</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Try selecting more interests or broader preferences
          </p>
          <button
            onClick={onRetake}
            className="mt-4 px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      )}

      {/* More to Explore */}
      {moreToExplore.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center" style={{ color: "var(--text-secondary)" }}>
            More to Explore
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moreToExplore.slice(0, 6).map((sg) => (
              <EventCard
                key={sg.group.pk}
                href={`/groups/${encodeURIComponent(sg.group.title)}`}
                title={sg.group.title}
                imageUrl={sg.group.image_url}
                category={sg.group.category}
                description={sg.group.description}
                venue={sg.group.scheduleLocation}
                badge={`${sg.score}% match`}
                tags={sg.reasons.slice(0, 2)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
