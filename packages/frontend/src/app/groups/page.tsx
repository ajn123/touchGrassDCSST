import GroupsClient from "@/components/GroupsClient";
import { getGroups } from "@/lib/dynamodb/dynamodb-groups";

export default async function GroupsPage() {
  const groups = await getGroups();
  const publicGroups = groups.filter((group) => group.isPublic === "true");

  return <GroupsClient groups={publicGroups as any} />;
}
