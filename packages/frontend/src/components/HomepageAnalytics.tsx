"use client";

import { trackHomepageVisit } from "@/lib/analyticsTrack";
import { useEffect } from "react";

export default function HomepageAnalytics() {
  useEffect(() => {
    // Track homepage visit when component mounts
    trackHomepageVisit();

    // Optional: Track additional metrics
    const startTime = performance.now();

    return () => {
      // Track time spent on homepage
      const timeSpent = performance.now() - startTime;
      console.log(`Time spent on homepage: ${timeSpent.toFixed(2)}ms`);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
