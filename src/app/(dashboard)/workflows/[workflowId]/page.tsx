import { getWorkflowDetail } from "@/lib/queries/workflows";
import { getStages, getTags } from "@/lib/queries/pipeline";
import { getSequences } from "@/lib/queries/sequences";
import { getGroups } from "@/lib/queries/groups";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { WorkflowForm } from "../_components/workflow-form";
import type { WorkflowInput } from "@/lib/validations/workflow";

interface WorkflowDetailPageProps {
  params: Promise<{ workflowId: string }>;
}

export default async function WorkflowDetailPage({
  params,
}: WorkflowDetailPageProps) {
  const { workflowId } = await params;
  const [{ workflow, actions }, stages, tags, sequences, groups, members] =
    await Promise.all([
      getWorkflowDetail(workflowId),
      getStages(),
      getTags(),
      getSequences(),
      getGroups(),
      getAccountMemberProfiles(),
    ]);

  const triggerConfig = (workflow.trigger_config ?? {}) as Record<
    string,
    unknown
  >;

  const defaultValues: WorkflowInput = {
    name: workflow.name,
    triggerType: workflow.trigger_type as WorkflowInput["triggerType"],
    triggerStageId: String(triggerConfig.toStageId ?? triggerConfig.stageId ?? ""),
    triggerTagId: (triggerConfig.tagId as string) ?? "",
    triggerDays: triggerConfig.days != null ? String(triggerConfig.days) : "",
    triggerHours: triggerConfig.hours != null ? String(triggerConfig.hours) : "",
    cooldownHours:
      triggerConfig.cooldownHours != null ? String(triggerConfig.cooldownHours) : "",
    isActive: workflow.is_active,
    actions: actions.map((action) => {
      const config = (action.action_config ?? {}) as Record<string, unknown>;
      const actionType = action.action_type as WorkflowInput["actions"][number]["actionType"];
      const userId = (config.userId as string) ?? "";
      const groupId = (config.groupId as string) ?? "";
      return {
        actionType,
        subject: (config.subject as string) ?? "",
        bodyTemplate: (config.bodyTemplate as string) ?? (config.body as string) ?? "",
        sequenceId: (config.sequenceId as string) ?? "",
        tagId: (config.tagId as string) ?? "",
        groupId,
        stageId: (config.stageId as string) ?? "",
        userId,
        taskTitle: (config.title as string) ?? "",
        dueInDays: config.dueInDays != null ? String(config.dueInDays) : "",
        priority:
          config.priority === "low" || config.priority === "high" || config.priority === "normal"
            ? config.priority
            : undefined,
        reassignMode:
          actionType === "reassign"
            ? groupId
              ? "group"
              : userId
                ? "member"
                : "manager"
            : undefined,
        notifyMode:
          actionType === "notify_user" ? (userId ? "member" : "manager") : undefined,
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
        members={members.map((member) => ({
          userId: member.userId,
          email: member.email,
        }))}
      />
    </div>
  );
}
