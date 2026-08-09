"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SettingsSaveBar({ dirty, state, onDiscard }: {
  dirty: boolean;
  state: SaveState;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-20 mt-8 flex min-h-14 items-center justify-between gap-4 rounded-lg border border-border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="text-sm" aria-live="polite">
        {state === "saving" && <span className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Saving changes…</span>}
        {state === "saved" && <span className="flex items-center gap-2 text-hot"><Check className="size-4" />Changes saved</span>}
        {state === "error" && <span className="text-destructive">We couldn&apos;t save these settings. Review the fields and try again.</span>}
        {state === "idle" && <span className={dirty ? "text-foreground" : "text-muted-foreground"}>{dirty ? "You have unsaved changes." : "No unsaved changes."}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" type="button" disabled={!dirty || state === "saving"} />}>
            Discard
          </DialogTrigger>
          {dirty && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Discard unsaved changes?</DialogTitle>
                <DialogDescription>Your workspace settings will return to their last saved values.</DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <DialogClose render={<Button type="button" variant="destructive" onClick={onDiscard} />}>Discard changes</DialogClose>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
        <Button type="submit" disabled={!dirty || state === "saving"}>
          {state === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
