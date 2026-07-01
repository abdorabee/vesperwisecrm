import { getPipelineData } from "@/lib/queries/pipeline";
import { getGroups } from "@/lib/queries/groups";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { KanbanBoard } from "./_components/kanban-board";
import { NewLeadDialog } from "./_components/new-lead-dialog";
import { FilterBar } from "./_components/filter-bar";
import { ImportLeadsDialog } from "./_components/import-leads-dialog";

interface PipelinePageProps {
  searchParams: Promise<{
    stage?: string;
    tag?: string;
    owner?: string;
    q?: string;
  }>;
}

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const params = await searchParams;
  const [{ stages, leads, tags }, groups, members] = await Promise.all([
    getPipelineData({
      stageId: params.stage,
      tagId: params.tag,
      ownerId: params.owner,
      query: params.q,
    }),
    getGroups(),
    getAccountMemberProfiles(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <div className="flex items-center gap-2">
          <ImportLeadsDialog stages={stages} />
          <NewLeadDialog stages={stages} groups={groups} />
        </div>
      </div>
      <FilterBar stages={stages} tags={tags} members={members} />
      <KanbanBoard stages={stages} leads={leads} />
    </div>
  );
}
