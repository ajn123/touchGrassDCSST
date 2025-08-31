// Analytics tracking utilities
export interface VisitData {
  page: string;
  timestamp: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  category?: string;
  email?: string;
  name?: string;
  selectedCategories?: string[];
}

export type AnalyticsAction =
  | "USER_VISIT"
  | "USER_ACTION"
  | "EMAIL_SIGNUP"
  | "CONTACT_FORM"
  | "CATEGORY_SELECTION"
  | "SEARCH"
  | "CONTACT_FORM_SUBMISSION"
  | "EMAIL_SIGNUP_SUBMISSION"
  | "EVENT_PAGE_VISIT";

export function trackPageVisit(
  data: Partial<VisitData>,
  action: AnalyticsAction = "USER_VISIT",
  pk?: string,
  sk?: string
) {
  const visitData: VisitData = {
    page:
      data.page ||
      (typeof window !== "undefined" ? window.location.pathname : "/"),
    timestamp: new Date().toISOString(),
    userAgent:
      data.userAgent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : "server"),
    referer:
      data.referer ||
      (typeof document !== "undefined" ? document.referrer : ""),
    ...data,
  };

  // Send to your analytics service
  console.log("Page visit tracked:", visitData);

  const body = {
    pk: pk || `USER`,
    sk: sk || `TIME#${Date.now()}`,
    properties: visitData,
    action: action,
    userId: getUserId() || getSessionId(),
  };

  // Only make fetch request in browser environment
  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
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
}

export function trackEmailSignup(
  formData: any,
  pk: string = "EMAIL",
  sk: string = "TIME"
) {
  trackPageVisit(
    {
      page: "/api/email-signup",
      email: formData.email,
      name: formData.name,
      selectedCategories: formData.selectedCategories,
    },
    "EMAIL_SIGNUP_SUBMISSION",
    pk,
    `${sk}#${Date.now()}`
  );
}

export function trackEmailSent(
  emailData: any,
  pk: string = "EMAIL",
  sk: string = "TIME"
) {
  trackPageVisit(
    {
      page: "/api/sendEmail",
      data: emailData,
    },
    "CONTACT_FORM_SUBMISSION",
    pk,
    `${sk}#${Date.now()}`
  );
}

export function trackHomepageVisit() {
  trackPageVisit({
    page: "/",
  });
}

export function trackSearch(
  filters: any,
  pk: string = "SEARCH",
  sk: string = "TIME"
) {
  trackPageVisit(
    {
      page: `/search?${new URLSearchParams(filters).toString()}`,
    },
    "SEARCH",
    pk,
    `${sk}#${Date.now()}`
  );
}

export function trackEventPageVisit(eventId: string) {
  trackPageVisit(
    {
      page: `/events/${eventId}`,
    },
    "EVENT_PAGE_VISIT",
    "EVENT_PAGE_VISIT",
    `${eventId}#${Date.now()}`
  );
}

// Utility functions
function getSessionId(): string {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.sessionStorage) {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  }

  // Server-side fallback - generate a temporary ID
  return "server_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function getUserId(): string | undefined {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("userId") || undefined;
  }
  return undefined;
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
