"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitCallerLead } from "@/lib/actions/qualification";
import {
  callerIntakeSchema,
  type CallerIntakeFormInput,
} from "@/lib/validations/lead";
import { AiParseNotes } from "../../_components/ai-parse-notes";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";

interface ChipFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function ChipField({ label, value, options, onChange }: ChipFieldProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(value === option ? "" : option)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors duration-150",
              value === option
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
  );
}

const CONDITION_OPTIONS = ["Good", "Fair", "Poor"];
const OCCUPANCY_OPTIONS = ["Owner occupied", "Tenant occupied", "Vacant"];

export function IntakeForm() {
  const router = useRouter();
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CallerIntakeFormInput>({
    resolver: zodResolver(callerIntakeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      property: {},
    },
  });

  const condition = watch("property.condition") ?? "";
  const occupancyStatus = watch("property.occupancyStatus") ?? "";

  function handleExtracted(fields: ExtractedCallNoteFields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value == null || value === "") {
        continue;
      }
      setValue(
        `property.${key as keyof CallerIntakeFormInput["property"]}`,
        value,
        { shouldDirty: true },
      );
    }
  }

  async function onSubmit(data: CallerIntakeFormInput) {
    try {
      await submitCallerLead(data);
      toast.success("Lead submitted for review");
      reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit lead",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-8">
      <AiParseNotes onExtracted={handleExtracted} />

      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="intake-firstName">Seller name</FieldLabel>
            <Input id="intake-firstName" {...register("firstName")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-phone">Phone *</FieldLabel>
            <Input id="intake-phone" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="intake-email">Email</FieldLabel>
          <Input id="intake-email" type="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="intake-addressLine1">
            Property address *
          </FieldLabel>
          <Input id="intake-addressLine1" {...register("addressLine1")} />
          <FieldError errors={[errors.addressLine1]} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="intake-city">City</FieldLabel>
            <Input id="intake-city" {...register("city")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-state">State</FieldLabel>
            <Input id="intake-state" {...register("state")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-postalCode">Zip</FieldLabel>
            <Input id="intake-postalCode" {...register("postalCode")} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <ChipField
          label="Occupancy"
          value={occupancyStatus}
          options={OCCUPANCY_OPTIONS}
          onChange={(value) => setValue("property.occupancyStatus", value)}
        />
        <Field>
          <FieldLabel htmlFor="intake-tenantDurationRent">
            Tenant duration & rent (if tenant occupied)
          </FieldLabel>
          <Input
            id="intake-tenantDurationRent"
            {...register("property.tenantDurationRent")}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <ChipField
          label="Overall condition"
          value={condition}
          options={CONDITION_OPTIONS}
          onChange={(value) => setValue("property.condition", value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="intake-updatesDone">Updates done</FieldLabel>
            <Input id="intake-updatesDone" {...register("property.updatesDone")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-updatesNeeded">
              Updates needed
            </FieldLabel>
            <Input
              id="intake-updatesNeeded"
              {...register("property.updatesNeeded")}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="intake-workNeeded">Work needed</FieldLabel>
          <Input id="intake-workNeeded" {...register("property.workNeeded")} />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="intake-roofCondition">Roof</FieldLabel>
            <Input
              id="intake-roofCondition"
              {...register("property.roofCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-flooringCondition">Flooring</FieldLabel>
            <Input
              id="intake-flooringCondition"
              {...register("property.flooringCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-kitchenBathCondition">
              Kitchen / bath
            </FieldLabel>
            <Input
              id="intake-kitchenBathCondition"
              {...register("property.kitchenBathCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-frameSidingCondition">
              Frame / siding
            </FieldLabel>
            <Input
              id="intake-frameSidingCondition"
              {...register("property.frameSidingCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-windowsCondition">Windows</FieldLabel>
            <Input
              id="intake-windowsCondition"
              {...register("property.windowsCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-basementType">Basement</FieldLabel>
            <Input id="intake-basementType" {...register("property.basementType")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-wallsCondition">Walls</FieldLabel>
            <Input
              id="intake-wallsCondition"
              {...register("property.wallsCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-electricalPlumbingCondition">
              Electrical / plumbing
            </FieldLabel>
            <Input
              id="intake-electricalPlumbingCondition"
              {...register("property.electricalPlumbingCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-furnaceCondition">Furnace</FieldLabel>
            <Input
              id="intake-furnaceCondition"
              {...register("property.furnaceCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-waterHeaterCondition">
              Water heater
            </FieldLabel>
            <Input
              id="intake-waterHeaterCondition"
              {...register("property.waterHeaterCondition")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-acCondition">AC</FieldLabel>
            <Input id="intake-acCondition" {...register("property.acCondition")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-mortgage">Mortgage</FieldLabel>
            <Input id="intake-mortgage" {...register("property.mortgage")} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="intake-bedrooms">Beds</FieldLabel>
            <Input
              id="intake-bedrooms"
              type="number"
              step="0.5"
              {...register("property.bedrooms")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-bathrooms">Baths</FieldLabel>
            <Input
              id="intake-bathrooms"
              type="number"
              step="0.5"
              {...register("property.bathrooms")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-squareFeet">Sq ft</FieldLabel>
            <Input
              id="intake-squareFeet"
              type="number"
              {...register("property.squareFeet")}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="intake-askingPrice">Asking price</FieldLabel>
            <Input
              id="intake-askingPrice"
              type="number"
              step="0.01"
              {...register("property.askingPrice")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="intake-timeline">Timeline</FieldLabel>
            <Input id="intake-timeline" {...register("property.timeline")} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="intake-motivation">Motivation</FieldLabel>
          <Textarea
            id="intake-motivation"
            className="min-h-16"
            {...register("property.motivation")}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="intake-followUpContact">
            Follow-up contact
          </FieldLabel>
          <Input
            id="intake-followUpContact"
            placeholder="e.g. Call Jerry for future follow-ups"
            {...register("property.followUpContact")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="intake-notes">General notes</FieldLabel>
          <Textarea
            id="intake-notes"
            className="min-h-20"
            {...register("property.notes")}
          />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit lead"}
      </Button>
    </form>
  );
}
