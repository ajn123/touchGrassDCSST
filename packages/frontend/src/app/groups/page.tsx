import GroupsClient from "@/components/GroupsClient";
import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
