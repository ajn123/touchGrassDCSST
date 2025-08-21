// Analytics tracking utilities
export interface VisitData {
  page: string;
  timestamp: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
}

export function trackPageVisit(data: Partial<VisitData>) {
  const visitData: VisitData = {
    page: data.page || window.location.pathname,
    timestamp: new Date().toISOString(),
    userAgent: data.userAgent || navigator.userAgent,
    referer: data.referer || document.referrer,
    ...data,
  };

  // Send to your analytics service
  console.log("Page visit tracked:", visitData);

  const body = {
    userId: getUserId() || getSessionId(),
    properties: visitData,
    action: "USER_VISIT",
  };

  // Example: Send to API endpoint
  fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch((error) => {
    console.error("Failed to track page visit:", error);
  });
}

export function trackHomepageVisit() {
  trackPageVisit({
    page: "/",
    sessionId: getSessionId(),
    userId: getUserId(),
  });
}

export function trackEventPageVisit(eventId: string) {
  trackPageVisit({
    page: `/events/${eventId}`,
    sessionId: getSessionId(),
    userId: getUserId(),
  });
}

// Utility functions
function getSessionId(): string {
  let sessionId = sessionStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

function getUserId(): string | undefined {
  // Get from your auth context or localStorage
  return localStorage.getItem("userId") || undefined;
}

function generateSessionId(): string {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

// Hook for React components
export function useAnalytics() {
  return {
    trackPageVisit,
    trackHomepageVisit,
    trackEventPageVisit,
  };
}
