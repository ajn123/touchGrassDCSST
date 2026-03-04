import type { Metadata } from "next";
import { SearchPageContent } from "./SearchPageContent";

export const metadata: Metadata = {
  title: "Search Events & Groups",
  description:
    "Search hundreds of Washington DC events, community groups, and activities. Filter by category, date, cost, and location.",
  openGraph: {
    title: "Search Events & Groups | TouchGrass DC",
    description:
      "Find events and community groups in Washington DC. Filter by category, date, cost, and location.",
    url: "https://touchgrassdc.com/search",
  },
};

export default function SearchPage() {
  return <SearchPageContent />;
}
