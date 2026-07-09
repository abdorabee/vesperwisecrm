"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveClient } from "@/lib/actions/clients";
import { clientSchema, type ClientFormInput } from "@/lib/validations/client";
import type { Tables } from "@/lib/supabase/types";

interface ClientFormProps {
  client: Tables<"clients">;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      contactEmail: client.contact_email ?? "",
      contactPhone: client.contact_phone ?? "",
      notes: client.notes ?? "",
      driveFolderId: client.drive_folder_id ?? "",
    },
  });

  async function onSubmit(data: ClientFormInput) {
    try {
      await saveClient(data, client.id);
      toast.success("Client saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save client");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input id="client-name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="client-contactEmail">
              Contact email
            </FieldLabel>
            <Input
              id="client-contactEmail"
              type="email"
              {...register("contactEmail")}
            />
            <FieldError errors={[errors.contactEmail]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="client-contactPhone">
              Contact phone
            </FieldLabel>
            <Input id="client-contactPhone" {...register("contactPhone")} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="client-driveFolderId">
            Drive folder ID (optional)
          </FieldLabel>
          <Input
            id="client-driveFolderId"
            placeholder="Overrides the account default for this client's reports"
            {...register("driveFolderId")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-notes">Notes</FieldLabel>
          <Textarea id="client-notes" {...register("notes")} />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
