"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { inviteClientUser } from "@/lib/actions/clients";
import {
  inviteClientUserSchema,
  type InviteClientUserInput,
} from "@/lib/validations/client";

interface InviteClientDialogProps {
  clientId: string;
}

export function InviteClientDialog({ clientId }: InviteClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteClientUserInput>({
    resolver: zodResolver(inviteClientUserSchema),
  });

  async function onSubmit(data: InviteClientUserInput) {
    try {
      await inviteClientUser(clientId, data);
      toast.success("Portal invite sent");
      reset({ email: "" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invite",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Invite portal user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a portal login</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-client-email">Email</FieldLabel>
              <Input
                id="invite-client-email"
                type="email"
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
