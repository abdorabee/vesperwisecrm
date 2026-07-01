"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerSendingDomain } from "@/lib/actions/account-email";
import {
  registerSendingDomainSchema,
  type RegisterSendingDomainInput,
} from "@/lib/validations/account-email";

interface DomainOnboardingProps {
  currentDomain: string | null;
}

export function DomainOnboarding({ currentDomain }: DomainOnboardingProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSendingDomainInput>({
    resolver: zodResolver(registerSendingDomainSchema),
    defaultValues: { domain: currentDomain ?? "" },
  });

  async function onSubmit(data: RegisterSendingDomainInput) {
    setIsSubmitting(true);
    try {
      await registerSendingDomain(data);
      toast.success("Sending domain registered");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to register domain",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sending-domain">Sending domain</FieldLabel>
          <Input
            id="sending-domain"
            placeholder="yourcompany.com"
            {...register("domain")}
          />
          <FieldError errors={[errors.domain]} />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registering..." : currentDomain ? "Update domain" : "Register domain"}
      </Button>
    </form>
  );
}
