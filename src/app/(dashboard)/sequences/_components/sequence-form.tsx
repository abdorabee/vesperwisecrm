"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
  FieldDescription,
} from "@/components/ui/field";
import { saveSequence } from "@/lib/actions/sequences";
import { sequenceSchema, type SequenceInput } from "@/lib/validations/sequence";

interface SequenceFormProps {
  sequenceId?: string;
  defaultValues?: SequenceInput;
}

const emptyStep = {
  channel: "email" as const,
  delayDays: "0",
  subject: "",
  bodyTemplate: "",
};

export function SequenceForm({ sequenceId, defaultValues }: SequenceFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SequenceInput>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: defaultValues ?? {
      name: "",
      description: "",
      steps: [emptyStep],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "steps" });

  async function onSubmit(data: SequenceInput) {
    try {
      const result = await saveSequence(data, sequenceId);
      toast.success("Sequence saved");
      router.push(`/sequences/${result.sequenceId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save sequence",
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
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={2} {...register("description")} />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Steps</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyStep)}
          >
            <Plus className="size-3.5" /> Add step
          </Button>
        </div>

        {errors.steps?.root?.message && (
          <p className="text-sm text-destructive">{errors.steps.root.message}</p>
        )}

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="flex flex-col gap-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Step {index + 1}</span>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Channel</FieldLabel>
                  <Controller
                    control={control}
                    name={`steps.${index}.channel`}
                    render={({ field: channelField }) => (
                      <Select
                        value={channelField.value}
                        onValueChange={(value) =>
                          value && channelField.onChange(value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value: string) =>
                              value === "sms" ? "SMS (coming soon)" : "Email"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms" disabled>
                            SMS (coming soon)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`steps.${index}.delayDays`}>
                    Delay after previous step (days)
                  </FieldLabel>
                  <Input
                    id={`steps.${index}.delayDays`}
                    inputMode="numeric"
                    {...register(`steps.${index}.delayDays`)}
                  />
                  <FieldError errors={[errors.steps?.[index]?.delayDays]} />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor={`steps.${index}.subject`}>Subject</FieldLabel>
                <Input id={`steps.${index}.subject`} {...register(`steps.${index}.subject`)} />
              </Field>

              <Field>
                <FieldLabel htmlFor={`steps.${index}.bodyTemplate`}>Message</FieldLabel>
                <Textarea
                  id={`steps.${index}.bodyTemplate`}
                  rows={4}
                  {...register(`steps.${index}.bodyTemplate`)}
                />
                <FieldDescription>
                  Supports {"{{first_name}}"} and {"{{last_name}}"} tokens.
                </FieldDescription>
                <FieldError errors={[errors.steps?.[index]?.bodyTemplate]} />
              </Field>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Saving..." : "Save sequence"}
      </Button>
    </form>
  );
}
