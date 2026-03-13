import FindMyGroupClient from "@/components/FindMyGroupClient";
import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Find My Group",
  description:
    "Take a quick quiz to discover community groups in DC that match your interests. Running clubs, social groups, outdoor adventures, and more.",
  openGraph: {
    title: "Find My Group | TouchGrass DC",
    description:
      "Take a quick quiz to discover DC community groups matching your interests.",
    url: "https://touchgrassdc.com/find-my-group",
  },
};

export default async function FindMyGroupPage() {
  const groups = await getPublicGroups();
  return <FindMyGroupClient groups={groups as any} />;
}
