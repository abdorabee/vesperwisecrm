import { redirect } from "next/navigation";

export default async function LegacyGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/settings/routing/${groupId}`);
}
