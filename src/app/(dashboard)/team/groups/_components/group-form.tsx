"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { saveGroup } from "@/lib/actions/groups";
import { groupSchema, type GroupInput } from "@/lib/validations/group";
import type { MemberProfile } from "@/lib/queries/members";

interface GroupFormProps {
  groupId?: string;
  initialName?: string;
  members: MemberProfile[];
  existingWeights?: Record<string, number>;
}

export function GroupForm({
  groupId,
  initialName,
  members,
  existingWeights,
}: GroupFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialName ?? "",
      members: members.map((member) => ({
        userId: member.userId,
        weight: String(existingWeights?.[member.userId] ?? (groupId ? 0 : 1)),
      })),
    },
  });

  const { fields } = useFieldArray({ control, name: "members" });

  async function onSubmit(data: GroupInput) {
    try {
      const result = await saveGroup(data, groupId);
      toast.success("Group saved");
      router.push(`/team/groups/${result.groupId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save group",
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
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">Member weights</h2>
          <FieldDescription>
            0–10 stars per member. 0 pauses a member (e.g. on vacation); higher
            numbers get proportionally more leads from this group&apos;s round
            robin.
          </FieldDescription>
        </div>

        <Card>
          <CardContent className="flex flex-col divide-y px-4">
            {fields.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                No team members yet.
              </p>
            )}
            {fields.map((field, index) => {
              const member = members.find((m) => m.userId === field.userId);
              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm">{member?.email ?? field.userId}</span>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      inputMode="numeric"
                      {...register(`members.${index}.weight`)}
                    />
                    <FieldError errors={[errors.members?.[index]?.weight]} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Saving..." : "Save group"}
      </Button>
    </form>
  );
}
