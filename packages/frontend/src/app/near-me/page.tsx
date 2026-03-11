import type { Metadata } from "next";
import NearMeClient from "./NearMeClient";

export const metadata: Metadata = {
  title: "Events Near Me | Find DC Events Close to You",
  description:
    "Discover events happening near your current location in Washington DC. Browse by distance and find things to do nearby.",
  openGraph: {
    title: "Events Near Me | TouchGrass DC",
    description:
      "Find events happening near you in Washington DC, sorted by distance.",
    url: "https://touchgrassdc.com/near-me",
  },
};

export default function NearMePage() {
  return <NearMeClient />;
}
