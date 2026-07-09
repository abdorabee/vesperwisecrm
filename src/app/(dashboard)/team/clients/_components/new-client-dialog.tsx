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
import { saveClient } from "@/lib/actions/clients";
import { clientSchema, type ClientFormInput } from "@/lib/validations/client";

export function NewClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", contactEmail: "", contactPhone: "", notes: "" },
  });

  async function onSubmit(data: ClientFormInput) {
    try {
      const { clientId } = await saveClient(data);
      toast.success("Client added");
      reset();
      setOpen(false);
      router.push(`/team/clients/${clientId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add client");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New client</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="client-name">Name</FieldLabel>
              <Input id="client-name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
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
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
