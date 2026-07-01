import { getWorkflowDetail } from "@/lib/queries/workflows";
import { getStages, getTags } from "@/lib/queries/pipeline";
import { getSequences } from "@/lib/queries/sequences";
import { getGroups } from "@/lib/queries/groups";
import { WorkflowForm } from "../_components/workflow-form";
import type { WorkflowInput } from "@/lib/validations/workflow";

interface WorkflowDetailPageProps {
  params: Promise<{ workflowId: string }>;
}

export default async function WorkflowDetailPage({
  params,
}: WorkflowDetailPageProps) {
  const { workflowId } = await params;
  const [{ workflow, actions }, stages, tags, sequences, groups] =
    await Promise.all([
      getWorkflowDetail(workflowId),
      getStages(),
      getTags(),
      getSequences(),
      getGroups(),
    ]);

  const triggerConfig = (workflow.trigger_config ?? {}) as Record<
    string,
    unknown
  >;

  const defaultValues: WorkflowInput = {
    name: workflow.name,
    triggerType: workflow.trigger_type as WorkflowInput["triggerType"],
    triggerStageId: (triggerConfig.toStageId as string) ?? "",
    triggerTagId: (triggerConfig.tagId as string) ?? "",
    triggerDays: triggerConfig.days != null ? String(triggerConfig.days) : "",
    isActive: workflow.is_active,
    actions: actions.map((action) => {
      const config = (action.action_config ?? {}) as Record<string, unknown>;
      return {
        actionType: action.action_type as WorkflowInput["actions"][number]["actionType"],
        subject: (config.subject as string) ?? "",
        bodyTemplate: (config.bodyTemplate as string) ?? "",
        sequenceId: (config.sequenceId as string) ?? "",
        tagId: (config.tagId as string) ?? "",
        groupId: (config.groupId as string) ?? "",
        stageId: (config.stageId as string) ?? "",
      };
    }),
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{workflow.name}</h1>
      <WorkflowForm
        workflowId={workflow.id}
        defaultValues={defaultValues}
        stages={stages}
        tags={tags}
        sequences={sequences}
        groups={groups}
      />
    </div>
  );
}
