"use client";

import { useEffect, useState, useTransition } from "react";
import { Mic, MicOff, PhoneOff, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveDialerNotes, setDialerDisposition } from "@/lib/actions/dialer";
import { TERMINAL_CALL_STATUSES } from "@/lib/dialer/types";
import type { Tables } from "@/lib/supabase/types";
import { useDialerSession } from "@/components/dialer/dialer-session-provider";

function durationLabel(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ActiveCallPanel({ dispositions }: { dispositions: Tables<"call_dispositions">[] }) {
  const dialer = useDialerSession();
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState("");
  const [dispositionId, setDispositionId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dialer.active || TERMINAL_CALL_STATUSES.has(dialer.active.status)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dialer.active]);

  if (!dialer.active) return null;
  const terminal = TERMINAL_CALL_STATUSES.has(dialer.active.status);

  function saveDisposition(): void {
    if (!dialer.active || !dispositionId) return;
    startTransition(async () => {
      try {
        await setDialerDisposition({
          attemptId: dialer.active!.attemptId,
          dispositionId,
          notes,
        });
        toast.success("Call outcome saved");
        dialer.clear();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save call outcome");
      }
    });
  }

  function saveNotes(): void {
    if (!dialer.active) return;
    startTransition(async () => {
      try {
        await saveDialerNotes(dialer.active!.attemptId, notes);
        toast.success("Call notes saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save notes");
      }
    });
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 w-[min(26rem,calc(100vw-2.5rem))]">
      <Card className="border-lime-400/40 bg-card shadow-2xl">
        <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={terminal ? "secondary" : "default"}>{dialer.active.status.replace("_", " ")}</Badge>
              {!dialer.realtimeConnected && <span className="text-xs text-amber-500">Polling</span>}
            </div>
            <CardTitle className="text-base">{dialer.active.contactName}</CardTitle>
            {dialer.active.leadTitle && <p className="mt-1 text-xs text-muted-foreground">{dialer.active.leadTitle}</p>}
          </div>
          {terminal && (
            <Button variant="ghost" size="icon-sm" onClick={dialer.clear} aria-label="Dismiss call">
              <X className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="font-mono text-2xl tabular-nums">
            {durationLabel(dialer.active.startedAt, now)}
          </div>
          {dialer.active.error && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{dialer.active.error}</p>
          )}
          {!terminal && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={dialer.toggleMute} disabled={!dialer.active.recoverable}>
                  {dialer.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {dialer.muted ? "Unmute" : "Mute"}
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => void dialer.hangup()}>
                  <PhoneOff className="size-4" /> End call
                </Button>
              </div>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={10000} placeholder="Call notes" rows={2} />
              <Button variant="outline" className="w-full" disabled={pending} onClick={saveNotes}>
                {pending ? "Saving…" : "Save notes"}
              </Button>
            </div>
          )}
          {terminal && (
            <div className="space-y-3 border-t pt-4">
              <Select value={dispositionId} onValueChange={(value) => setDispositionId(value ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select call outcome" /></SelectTrigger>
                <SelectContent>
                  {dispositions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={10000} placeholder="Call notes" rows={3} />
              <Button className="w-full" disabled={!dispositionId || pending} onClick={saveDisposition}>
                {pending ? "Saving…" : "Save outcome"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
