"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { sendLeadEmail } from "@/lib/actions/email";
import { sendEmailSchema, type SendEmailInput } from "@/lib/validations/email";

interface SendEmailDialogProps {
  leadId: string;
  contactEmail: string | null;
}

export function SendEmailDialog({ leadId, contactEmail }: SendEmailDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SendEmailInput>({
    resolver: zodResolver(sendEmailSchema),
  });

  async function onSubmit(data: SendEmailInput) {
    try {
      await sendLeadEmail(leadId, data);
      toast.success("Email sent");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" disabled={!contactEmail} />}>
        Send email
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="to">To</FieldLabel>
              <Input id="to" value={contactEmail ?? ""} disabled readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="subject">Subject</FieldLabel>
              <Input id="subject" {...register("subject")} />
              <FieldError errors={[errors.subject]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="body">Message</FieldLabel>
              <Textarea id="body" rows={6} {...register("body")} />
              <FieldDescription>Plain text only for now.</FieldDescription>
              <FieldError errors={[errors.body]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
