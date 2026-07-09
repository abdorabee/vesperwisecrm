import { PageHeader } from "@/components/page-header";
import { getSubmittedLeadsQueue } from "@/lib/queries/qualification";
import { getGroups } from "@/lib/queries/groups";
import { QueueList } from "./_components/queue-list";

export default async function QueuePage() {
  const [leads, groups] = await Promise.all([
    getSubmittedLeadsQueue(),
    getGroups(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lead queue"
        description="Confirm submitted leads before they route to acquisitions, send them back for missing details, or reject them with a reason."
      />
      <QueueList leads={leads} groups={groups} />
    </div>
  );
}
