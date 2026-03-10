import PerfectDayClient from "@/components/PerfectDayClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Perfect Day Planner",
  description:
    "Plan your perfect day in DC with AI-powered itineraries. Combine real events, restaurants, and activities into a full morning-to-night plan.",
  openGraph: {
    title: "Perfect Day Planner | TouchGrass DC",
    description:
      "Plan your perfect day in DC with AI-powered itineraries combining events, dining, and activities.",
    url: "https://touchgrassdc.com/perfect-day",
  },
};

export default function PerfectDayPage() {
  return <PerfectDayClient />;
}
