"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clearContactDoNotCall } from "@/lib/actions/dialer";

export function ContactDoNotCallControl({
  contactId,
  isAdmin,
}: {
  contactId: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!isAdmin) return <Badge variant="destructive" className="mt-2 w-fit">Do not call</Badge>;

  function clear(): void {
    startTransition(async () => {
      try {
        await clearContactDoNotCall({ contactId, reason });
        toast.success("Do Not Call suppression cleared");
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not clear suppression");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="mt-2 w-fit" />}>
        <Badge variant="destructive">Do not call · manage</Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Clear Do Not Call suppression</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">This permits staff to call the normalized number again across the workspace. The reason is retained in the call audit history.</p>
        <div className="space-y-2"><Label htmlFor="dnc-clear-reason">Reason</Label><Textarea id="dnc-clear-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></div>
        <DialogFooter><Button disabled={reason.trim().length < 3 || pending} onClick={clear}>{pending ? "Clearing…" : "Clear suppression"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
