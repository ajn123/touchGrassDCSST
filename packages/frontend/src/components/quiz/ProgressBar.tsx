"use client";

const STEP_LABELS = ["Interests", "Preferences", "Results"];

export default function ProgressBar({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center mb-10">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isActive
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20"
                      : "border-2 text-gray-400"
                }`}
                style={
                  !isCompleted && !isActive
                    ? { borderColor: "var(--border-color, #d1d5db)" }
                    : undefined
                }
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive ? "text-emerald-600" : ""
                }`}
                style={!isActive ? { color: "var(--text-secondary)" } : undefined}
              >
                {STEP_LABELS[i]}
              </span>
            </div>

            {/* Connecting line */}
            {step < totalSteps && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 mb-6 transition-colors ${
                  isCompleted ? "bg-emerald-600" : ""
                }`}
                style={!isCompleted ? { backgroundColor: "var(--border-color, #d1d5db)" } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
