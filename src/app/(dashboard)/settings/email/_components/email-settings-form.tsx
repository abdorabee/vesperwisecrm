"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateEmailIdentity } from "@/lib/actions/account-email";
import {
  updateEmailIdentitySchema,
  type UpdateEmailIdentityInput,
} from "@/lib/validations/account-email";

interface EmailSettingsFormProps {
  fromName: string | null;
  fromEmail: string | null;
  sendingDomain: string | null;
  disabled: boolean;
}

export function EmailSettingsForm({
  fromName,
  fromEmail,
  sendingDomain,
  disabled,
}: EmailSettingsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEmailIdentityInput>({
    resolver: zodResolver(updateEmailIdentitySchema),
    defaultValues: {
      fromName: fromName ?? "",
      fromEmail: fromEmail ?? "",
    },
  });

  async function onSubmit(data: UpdateEmailIdentityInput) {
    try {
      await updateEmailIdentity(data);
      toast.success("From address saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save From address",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="from-name">From name</FieldLabel>
          <Input
            id="from-name"
            placeholder="Your Company"
            disabled={disabled}
            {...register("fromName")}
          />
          <FieldError errors={[errors.fromName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="from-email">From email</FieldLabel>
          <Input
            id="from-email"
            type="email"
            placeholder={sendingDomain ? `hello@${sendingDomain}` : "hello@yourcompany.com"}
            disabled={disabled}
            {...register("fromEmail")}
          />
          <FieldError errors={[errors.fromEmail]} />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={disabled || isSubmitting}>
        {isSubmitting ? "Saving..." : "Save From address"}
      </Button>
    </form>
  );
}
