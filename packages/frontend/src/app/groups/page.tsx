import GroupsClient from "@/components/GroupsClient";
import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import type { Metadata } from "next";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Community Groups & Clubs in DC",
  description:
    "Find run clubs, social groups, sports leagues, dance classes, and community organizations in the DC, Maryland, and Virginia area.",
  openGraph: {
    title: "Community Groups & Clubs | TouchGrass DC",
    description:
      "Find run clubs, social groups, sports leagues, and community organizations in the DMV.",
    url: "https://touchgrassdc.com/groups",
  },
};

export default async function GroupsPage() {
  // Use getPublicGroups which filters at the database level
  const publicGroups = await getPublicGroups();

  console.log(`📊 Groups page: Found ${publicGroups.length} public groups`);
  console.log(
    `📊 Groups page: Group titles:`,
    publicGroups.map((g) => g.title)
  );

  return <GroupsClient groups={publicGroups as any} />;
}
