"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { saveWorkflow } from "@/lib/actions/workflows";
import { workflowSchema, type WorkflowInput } from "@/lib/validations/workflow";
import type { Tables } from "@/lib/supabase/types";
import type { GroupWithMembers } from "@/lib/queries/groups";

interface WorkflowFormProps {
  workflowId?: string;
  defaultValues?: WorkflowInput;
  stages: Tables<"pipeline_stages">[];
  tags: Tables<"tags">[];
  sequences: Tables<"sequences">[];
  groups: GroupWithMembers[];
}

const TRIGGER_LABELS: Record<WorkflowInput["triggerType"], string> = {
  lead_created: "When a lead is created",
  stage_changed: "When a lead's stage changes",
  tag_added: "When a tag is added",
  no_activity_days: "When a lead has no activity for N days",
  no_next_action: "When a lead has no next action for N hours",
};

const ACTION_LABELS: Record<string, string> = {
  send_email_template: "Send an email",
  enroll_sequence: "Enroll in a sequence",
  add_tag: "Add a tag",
  assign_round_robin: "Assign via routing group",
  change_stage: "Change stage",
};

const emptyAction: WorkflowInput["actions"][number] = {
  actionType: "send_email_template",
  subject: "",
  bodyTemplate: "",
};

export function WorkflowForm({
  workflowId,
  defaultValues,
  stages,
  tags,
  sequences,
  groups,
}: WorkflowFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkflowInput>({
    resolver: zodResolver(workflowSchema),
    defaultValues: defaultValues ?? {
      name: "",
      triggerType: "lead_created",
      isActive: true,
      actions: [emptyAction],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "actions" });
  const triggerType = useWatch({ control, name: "triggerType" });

  async function onSubmit(data: WorkflowInput) {
    try {
      const result = await saveWorkflow(data, workflowId);
      toast.success("Workflow saved");
      router.push(`/workflows/${result.workflowId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workflow",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel>Trigger</FieldLabel>
          <Controller
            control={control}
            name="triggerType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: WorkflowInput["triggerType"]) => TRIGGER_LABELS[value]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {triggerType === "stage_changed" && (
          <Field>
            <FieldLabel>Only when stage becomes (optional)</FieldLabel>
            <Controller
              control={control}
              name="triggerStageId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any stage">
                      {(value: string) =>
                        stages.find((s) => s.id === value)?.name ?? "Any stage"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}

        {triggerType === "tag_added" && (
          <Field>
            <FieldLabel>Only when this tag is added (optional)</FieldLabel>
            <Controller
              control={control}
              name="triggerTagId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any tag">
                      {(value: string) =>
                        tags.find((t) => t.id === value)?.name ?? "Any tag"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}

        {triggerType === "no_activity_days" && (
          <Field>
            <FieldLabel htmlFor="triggerDays">Days without activity</FieldLabel>
            <Input id="triggerDays" inputMode="numeric" {...register("triggerDays")} />
            <FieldError errors={[errors.triggerDays]} />
          </Field>
        )}

        {triggerType === "no_next_action" && (
          <Field>
            <FieldLabel htmlFor="triggerHours">
              Hours without an open task or active sequence
            </FieldLabel>
            <Input id="triggerHours" inputMode="numeric" {...register("triggerHours")} />
            <FieldError errors={[errors.triggerHours]} />
          </Field>
        )}

        <Field orientation="horizontal">
          <input
            id="isActive"
            type="checkbox"
            className="size-4"
            {...register("isActive")}
          />
          <FieldLabel htmlFor="isActive">Active</FieldLabel>
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Actions</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyAction)}
          >
            <Plus className="size-3.5" /> Add action
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="flex flex-col gap-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Action {index + 1}</span>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label="Remove action"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <Field>
                <FieldLabel>Type</FieldLabel>
                <Controller
                  control={control}
                  name={`actions.${index}.actionType`}
                  render={({ field: actionField }) => (
                    <Select
                      value={actionField.value}
                      onValueChange={(v) => v && actionField.onChange(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => ACTION_LABELS[value] ?? value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <ActionFields
                index={index}
                control={control}
                register={register}
                errors={errors}
                stages={stages}
                tags={tags}
                sequences={sequences}
                groups={groups}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Saving..." : "Save workflow"}
      </Button>
    </form>
  );
}

interface ActionFieldsProps {
  index: number;
  control: ReturnType<typeof useForm<WorkflowInput>>["control"];
  register: ReturnType<typeof useForm<WorkflowInput>>["register"];
  errors: ReturnType<typeof useForm<WorkflowInput>>["formState"]["errors"];
  stages: Tables<"pipeline_stages">[];
  tags: Tables<"tags">[];
  sequences: Tables<"sequences">[];
  groups: GroupWithMembers[];
}

function ActionFields({
  index,
  control,
  register,
  errors,
  stages,
  tags,
  sequences,
  groups,
}: ActionFieldsProps) {
  const actionType = useWatch({ control, name: `actions.${index}.actionType` });

  if (actionType === "send_email_template") {
    return (
      <>
        <Field>
          <FieldLabel htmlFor={`actions.${index}.subject`}>Subject</FieldLabel>
          <Input id={`actions.${index}.subject`} {...register(`actions.${index}.subject`)} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`actions.${index}.bodyTemplate`}>Message</FieldLabel>
          <Textarea
            id={`actions.${index}.bodyTemplate`}
            rows={4}
            {...register(`actions.${index}.bodyTemplate`)}
          />
          <FieldError errors={[errors.actions?.[index]?.bodyTemplate]} />
        </Field>
      </>
    );
  }

  if (actionType === "enroll_sequence") {
    return (
      <Field>
        <FieldLabel>Sequence</FieldLabel>
        <Controller
          control={control}
          name={`actions.${index}.sequenceId`}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a sequence">
                  {(value: string) =>
                    sequences.find((s) => s.id === value)?.name ?? "Select a sequence"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sequences.map((sequence) => (
                  <SelectItem key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.actions?.[index]?.sequenceId]} />
      </Field>
    );
  }

  if (actionType === "add_tag") {
    return (
      <Field>
        <FieldLabel>Tag</FieldLabel>
        <Controller
          control={control}
          name={`actions.${index}.tagId`}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a tag">
                  {(value: string) => tags.find((t) => t.id === value)?.name ?? "Select a tag"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.actions?.[index]?.tagId]} />
      </Field>
    );
  }

  if (actionType === "assign_round_robin") {
    return (
      <Field>
        <FieldLabel>Routing group</FieldLabel>
        <Controller
          control={control}
          name={`actions.${index}.groupId`}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a group">
                  {(value: string) =>
                    groups.find((g) => g.id === value)?.name ?? "Select a group"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.actions?.[index]?.groupId]} />
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>Target stage</FieldLabel>
      <Controller
        control={control}
        name={`actions.${index}.stageId`}
        render={({ field }) => (
          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a stage">
                {(value: string) =>
                  stages.find((s) => s.id === value)?.name ?? "Select a stage"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[errors.actions?.[index]?.stageId]} />
    </Field>
  );
}
