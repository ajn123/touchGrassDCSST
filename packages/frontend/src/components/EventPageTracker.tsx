"use client";

import { addToClickHistory } from "@/lib/userPreferences";
import { useEffect } from "react";

export function EventPageTracker({
  eventId,
  category,
}: {
  eventId?: string;
  category?: string;
}) {
  useEffect(() => {
    if (eventId) {
      addToClickHistory(eventId, category);
    }
  }, [eventId, category]);

  return null;
}
