import { getStages, getTags } from "@/lib/queries/pipeline";
import { getSequences } from "@/lib/queries/sequences";
import { getGroups } from "@/lib/queries/groups";
import { WorkflowForm } from "../_components/workflow-form";

export default async function NewWorkflowPage() {
  const [stages, tags, sequences, groups] = await Promise.all([
    getStages(),
    getTags(),
    getSequences(),
    getGroups(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New workflow</h1>
      <WorkflowForm stages={stages} tags={tags} sequences={sequences} groups={groups} />
    </div>
  );
}
