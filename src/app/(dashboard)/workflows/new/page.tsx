import { getStages, getTags } from "@/lib/queries/pipeline";
import { getSequences } from "@/lib/queries/sequences";
import { getGroups } from "@/lib/queries/groups";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { WorkflowForm } from "../_components/workflow-form";

export default async function NewWorkflowPage() {
  const [stages, tags, sequences, groups, members] = await Promise.all([
    getStages(),
    getTags(),
    getSequences(),
    getGroups(),
    getAccountMemberProfiles(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New workflow</h1>
      <WorkflowForm
        stages={stages}
        tags={tags}
        sequences={sequences}
        groups={groups}
        members={members.map((member) => ({
          userId: member.userId,
          email: member.email,
        }))}
      />
    </div>
  );
}
