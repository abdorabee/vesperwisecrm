"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { createLead } from "@/lib/actions/leads";
import { assignLeadToGroup } from "@/lib/actions/groups";
import { newLeadSchema, type NewLeadInput } from "@/lib/validations/lead";
import type { Tables } from "@/lib/supabase/types";
import type { GroupWithMembers } from "@/lib/queries/groups";

interface NewLeadDialogProps {
  stages: Tables<"pipeline_stages">[];
  groups: GroupWithMembers[];
}

const NO_GROUP = "__none__";

export function NewLeadDialog({ stages, groups }: NewLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [routingGroupId, setRoutingGroupId] = useState(NO_GROUP);
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewLeadInput>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: {
      pipelineStageId: stages[0]?.id ?? "",
    },
  });

  async function onSubmit(data: NewLeadInput) {
    try {
      const { leadId } = await createLead(data);

      if (routingGroupId !== NO_GROUP) {
        const { assignedUserId } = await assignLeadToGroup(
          leadId,
          routingGroupId,
        );
        if (!assignedUserId) {
          toast.warning(
            "Lead created, but no eligible member to assign in that group",
          );
        }
      }

      toast.success("Lead created");
      setOpen(false);
      reset();
      setRoutingGroupId(NO_GROUP);
      router.push(`/leads/${leadId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create lead",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New lead</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" {...register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="pipelineStageId">Stage</FieldLabel>
              <Controller
                control={control}
                name="pipelineStageId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger id="pipelineStageId" className="w-full">
                      <SelectValue placeholder="Select a stage">
                        {(value: string) =>
                          stages.find((stage) => stage.id === value)?.name ??
                          "Select a stage"
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
              <FieldError errors={[errors.pipelineStageId]} />
            </Field>

            {groups.length > 0 && (
              <Field>
                <FieldLabel htmlFor="routingGroupId">
                  Routing group (optional)
                </FieldLabel>
                <Select
                  value={routingGroupId}
                  onValueChange={(value) => value && setRoutingGroupId(value)}
                >
                  <SelectTrigger id="routingGroupId" className="w-full">
                    <SelectValue placeholder="No routing group">
                      {(value: string) =>
                        value === NO_GROUP
                          ? "No routing group"
                          : (groups.find((group) => group.id === value)
                              ?.name ?? "No routing group")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GROUP}>No routing group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="value">Value ($)</FieldLabel>
              <Input id="value" type="number" step="0.01" {...register("value")} />
              <FieldError errors={[errors.value]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input id="firstName" {...register("firstName")} />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input id="lastName" {...register("lastName")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" {...register("phone")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="company">Company</FieldLabel>
                <Input id="company" {...register("company")} />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
