"use client";

import { trackEventPageVisit } from "@/lib/analyticsTrack";
import { useEffect } from "react";

interface EventPageTrackerProps {
  eventId: string;
}

export function EventPageTracker({ eventId }: EventPageTrackerProps) {
  useEffect(() => {
    // This runs on the client-side where window.location.href is available
    console.log("Client-side tracking event page visit", eventId);
    trackEventPageVisit(eventId);
  }, [eventId]);

  // This component doesn't render anything
  return null;
}
