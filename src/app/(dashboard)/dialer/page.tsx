import { PageHeader } from "@/components/page-header";
import { getDialerPageData } from "@/lib/queries/dialer";
import { DialerWorkspace } from "./_components/dialer-workspace";

export default async function DialerPage() {
  const data = await getDialerPageData();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dialer"
        description="Work personal and shared call queues, place browser calls, and review outcomes. Calls start only when you confirm them."
      />
      <DialerWorkspace data={data} />
    </div>
  );
}
