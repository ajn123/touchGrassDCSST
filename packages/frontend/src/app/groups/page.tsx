import GroupsClient from "@/components/GroupsClient";
import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import type { Metadata } from "next";

export const revalidate = 3600;

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
  const publicGroups = await getPublicGroups();

  return <GroupsClient groups={publicGroups as any} />;
}
