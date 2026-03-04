"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ProgressBar from "./quiz/ProgressBar";
import StepInterests from "./quiz/StepInterests";
import StepPreferences from "./quiz/StepPreferences";
import StepResults from "./quiz/StepResults";
import { scoreGroup } from "@/lib/groupMatchingScore";
import {
  getQuizPreferences,
  saveQuizPreferences,
  clearQuizPreferences,
  type QuizPreferences,
} from "@/lib/groupQuizPreferences";
import type { Group } from "@/components/GroupsClient";

type Step = 1 | 2 | 3;

const DEFAULT_PREFS: QuizPreferences = {
  categories: [],
  scheduleDays: [],
  timePreference: "none",
  costPreference: "none",
};

export default function FindMyGroupClient({ groups }: { groups: Group[] }) {
  const [step, setStep] = useState<Step>(1);
  const [preferences, setPreferences] = useState<QuizPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Check for saved preferences on mount
  useEffect(() => {
    const saved = getQuizPreferences();
    if (saved && saved.categories.length > 0) {
      setPreferences(saved);
      setStep(3);
    }
    setLoaded(true);
  }, []);

  const scoredGroups = useMemo(() => {
    if (preferences.categories.length === 0) return [];
    return groups
      .map((group) => ({
        group,
        ...scoreGroup(group, preferences),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [groups, preferences]);

  const handleStepChange = useCallback((newStep: Step) => {
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRetake = useCallback(() => {
    clearQuizPreferences();
    setPreferences(DEFAULT_PREFS);
    handleStepChange(1);
  }, [handleStepChange]);

  const handleSave = useCallback(() => {
    saveQuizPreferences(preferences);
  }, [preferences]);

  // Don't render until we've checked localStorage (avoids flash)
  if (!loaded) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">Find My Group</h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            {step === 1 && "Select your interests and we'll match you with groups in DC"}
            {step === 2 && "Tell us about your schedule and preferences"}
            {step === 3 &&
              (scoredGroups.length > 0
                ? `We found ${scoredGroups.length} group${scoredGroups.length === 1 ? "" : "s"} for you`
                : "Let's find your perfect group")}
          </p>
        </div>

        <ProgressBar currentStep={step} totalSteps={3} />

        {step === 1 && (
          <StepInterests
            groups={groups}
            selectedCategories={preferences.categories}
            onCategoriesChange={(cats) =>
              setPreferences((p) => ({ ...p, categories: cats }))
            }
            onNext={() => handleStepChange(2)}
          />
        )}

        {step === 2 && (
          <StepPreferences
            preferences={preferences}
            onPreferencesChange={setPreferences}
            onNext={() => handleStepChange(3)}
            onBack={() => handleStepChange(1)}
            onSkip={() => handleStepChange(3)}
          />
        )}

        {step === 3 && (
          <StepResults
            scoredGroups={scoredGroups}
            preferences={preferences}
            onRetake={handleRetake}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
