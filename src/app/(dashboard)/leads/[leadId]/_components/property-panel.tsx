"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveLeadProperty } from "@/lib/actions/leads";
import {
  leadPropertySchema,
  type LeadPropertyFormInput,
} from "@/lib/validations/lead";
import type { Tables } from "@/lib/supabase/types";

interface PropertyPanelProps {
  leadId: string;
  property: Tables<"lead_properties"> | null;
}

function textValue(value: string | null | undefined): string {
  return value ?? "";
}

function numberValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function contractStatusValue(
  value: string | null | undefined,
): LeadPropertyFormInput["contractStatus"] {
  if (
    value === "offered" ||
    value === "under_contract" ||
    value === "closed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "none";
}

export function PropertyPanel({ leadId, property }: PropertyPanelProps) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadPropertyFormInput>({
    resolver: zodResolver(leadPropertySchema),
    defaultValues: {
      addressLine1: textValue(property?.address_line1),
      addressLine2: textValue(property?.address_line2),
      city: textValue(property?.city),
      state: textValue(property?.state),
      postalCode: textValue(property?.postal_code),
      propertyType: textValue(property?.property_type),
      bedrooms: numberValue(property?.bedrooms),
      bathrooms: numberValue(property?.bathrooms),
      squareFeet: numberValue(property?.square_feet),
      askingPrice: numberValue(property?.asking_price),
      estimatedValue: numberValue(property?.estimated_value),
      contractStatus: contractStatusValue(property?.contract_status),
      contractAmount: numberValue(property?.contract_amount),
      contractCloseDate: textValue(property?.contract_close_date),
      notes: textValue(property?.notes),
    },
  });

  async function onSubmit(data: LeadPropertyFormInput) {
    try {
      await saveLeadProperty(leadId, data);
      toast.success("Property details saved");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save property",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="property-addressLine1">Address</FieldLabel>
          <Input
            id="property-addressLine1"
            {...register("addressLine1")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="property-city">City</FieldLabel>
            <Input id="property-city" {...register("city")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="property-state">State</FieldLabel>
            <Input id="property-state" {...register("state")} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="property-postalCode">Postal code</FieldLabel>
            <Input id="property-postalCode" {...register("postalCode")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="property-propertyType">Type</FieldLabel>
            <Input
              id="property-propertyType"
              placeholder="Single family, condo..."
              {...register("propertyType")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field>
            <FieldLabel htmlFor="property-bedrooms">Beds</FieldLabel>
            <Input
              id="property-bedrooms"
              type="number"
              step="0.5"
              {...register("bedrooms")}
            />
            <FieldError errors={[errors.bedrooms]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="property-bathrooms">Baths</FieldLabel>
            <Input
              id="property-bathrooms"
              type="number"
              step="0.5"
              {...register("bathrooms")}
            />
            <FieldError errors={[errors.bathrooms]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="property-squareFeet">Sq ft</FieldLabel>
            <Input
              id="property-squareFeet"
              type="number"
              {...register("squareFeet")}
            />
            <FieldError errors={[errors.squareFeet]} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="property-askingPrice">Asking price</FieldLabel>
            <Input
              id="property-askingPrice"
              type="number"
              step="0.01"
              {...register("askingPrice")}
            />
            <FieldError errors={[errors.askingPrice]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="property-estimatedValue">
              Estimated value
            </FieldLabel>
            <Input
              id="property-estimatedValue"
              type="number"
              step="0.01"
              {...register("estimatedValue")}
            />
            <FieldError errors={[errors.estimatedValue]} />
          </Field>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="property-contractStatus">Contract</FieldLabel>
              <Controller
                control={control}
                name="contractStatus"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value ?? "none")}
                  >
                    <SelectTrigger
                      id="property-contractStatus"
                      className="w-full"
                    >
                      <SelectValue placeholder="No contract">
                        {(value: string) =>
                          ({
                            none: "No contract",
                            offered: "Offered",
                            under_contract: "Under contract",
                            closed: "Closed",
                            cancelled: "Cancelled",
                          })[value] ?? "No contract"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No contract</SelectItem>
                      <SelectItem value="offered">Offered</SelectItem>
                      <SelectItem value="under_contract">
                        Under contract
                      </SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="property-contractAmount">Amount</FieldLabel>
              <Input
                id="property-contractAmount"
                type="number"
                step="0.01"
                {...register("contractAmount")}
              />
              <FieldError errors={[errors.contractAmount]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="property-contractCloseDate">
                Close date
              </FieldLabel>
              <Input
                id="property-contractCloseDate"
                type="date"
                {...register("contractCloseDate")}
              />
            </Field>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="property-notes">Notes</FieldLabel>
          <Textarea id="property-notes" {...register("notes")} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save property"}
      </Button>
    </form>
  );
}
