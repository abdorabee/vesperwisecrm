"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClickToCallButton } from "@/components/dialer/click-to-call-button";
import {
  addDialerQueueItem,
  cancelDialerQueueItem,
  saveCallDisposition,
  saveDialerQueue,
  setDialerQueueStatus,
  updateDialerSettings,
} from "@/lib/actions/dialer";
import {
  disconnectDialerCredentials,
  saveDialerCredentials,
  testDialerCredentials,
} from "@/lib/actions/dialer-credentials";
import type { DialerPageData, DialerQueue } from "@/lib/queries/dialer";

const NONE = "__none__";

function contactName(contact: { first_name: string; last_name: string | null }): string {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ");
}

function QueueCard({ queue, data }: { queue: DialerQueue; data: DialerPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedLead, setSelectedLead] = useState("");
  const [currentTime] = useState(() => Date.now());
  const canManage = data.isAdmin || queue.owner_user_id === data.userId;
  const ready = queue.items.find((item) => item.status === "queued" &&
    (!item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= currentTime));

  function run(action: () => Promise<void>, success: string): void {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dialer action failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">{queue.name}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {queue.owner_user_id ? "Personal" : "Shared"} · {queue.items.filter((item) => item.status === "queued").length} waiting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={queue.status === "active" ? "default" : "secondary"}>{queue.status}</Badge>
          <Button
            size="icon-sm"
            variant="outline"
            disabled={!canManage || pending || queue.status === "completed"}
            title={queue.status === "active" ? "Pause queue" : "Resume queue"}
            onClick={() => run(
              () => setDialerQueueStatus(queue.id, queue.status === "active" ? "paused" : "active"),
              queue.status === "active" ? "Queue paused" : "Queue resumed",
            )}
          >
            {queue.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ready && queue.status === "active" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-lime-400/30 bg-lime-400/5 p-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Call next</p>
              <p className="font-medium">{contactName(ready.contact)}</p>
              <p className="text-xs text-muted-foreground">{ready.lead?.title ?? "Contact"} · {ready.attempts.length} prior attempt{ready.attempts.length === 1 ? "" : "s"}</p>
            </div>
            <ClickToCallButton
              contactId={ready.contact.id}
              contactName={contactName(ready.contact)}
              leadId={ready.lead_id}
              queueItemId={ready.id}
              disabled={Boolean(ready.contact.do_not_call_at)}
            />
          </div>
        )}

        {canManage && <div className="flex gap-2">
          <Select value={selectedLead} onValueChange={(value) => setSelectedLead(value ?? "")}>
            <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Add an accessible lead" /></SelectTrigger>
            <SelectContent>
              {data.candidateLeads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>{lead.title} — {contactName(lead.contact)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!selectedLead || pending}
            onClick={() => run(() => addDialerQueueItem({ queueId: queue.id, leadId: selectedLead }), "Lead added to queue")}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>}

        {queue.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No targets in this queue yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {queue.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><div className="font-medium">{contactName(item.contact)}</div><div className="text-xs text-muted-foreground">{item.lead?.title ?? "Contact"}</div></TableCell>
                    <TableCell><Badge variant="secondary">{item.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{item.attempts.length}</TableCell>
                    <TableCell className="text-right">
                      {canManage && item.status === "queued" && (
                        <Button variant="ghost" size="icon-sm" title="Cancel queue item" disabled={pending} onClick={() => run(() => cancelDialerQueueItem(item.id), "Queue item cancelled")}>
                          <X className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateQueueDialog({ data }: { data: DialerPageData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"personal" | "shared">("personal");
  const [groupId, setGroupId] = useState(NONE);

  function submit(): void {
    startTransition(async () => {
      try {
        await saveDialerQueue({
          name,
          ownerUserId: scope === "personal" ? data.userId : null,
          leadGroupId: scope === "shared" && groupId !== NONE ? groupId : null,
          maxActiveCalls: scope === "personal" ? 1 : 5,
          maxAttempts: data.settings?.default_max_attempts ?? 3,
          retryDelaySeconds: data.settings?.default_retry_delay_seconds ?? 300,
        });
        toast.success("Queue created");
        setOpen(false);
        setName("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create queue");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}><Plus className="size-4" /> New queue</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create dialer queue</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="queue-name">Name</Label><Input id="queue-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></div>
          <div className="space-y-2"><Label>Ownership</Label><Select value={scope} onValueChange={(value) => setScope(value as "personal" | "shared")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">Personal queue</SelectItem>{data.isAdmin && <SelectItem value="shared">Shared queue</SelectItem>}</SelectContent></Select></div>
          {scope === "shared" && data.groups.length > 0 && <div className="space-y-2"><Label>Lead group</Label><Select value={groupId} onValueChange={(value) => setGroupId(value ?? NONE)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Entire workspace</SelectItem>{data.groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></div>}
        </div>
        <DialogFooter><Button disabled={!name.trim() || pending} onClick={submit}>{pending ? "Creating…" : "Create queue"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function maskAccountSid(sid: string): string {
  return sid.length > 8 ? `${sid.slice(0, 6)}…${sid.slice(-4)}` : sid;
}

function TwilioAccountCard({ status }: { status: DialerPageData["twilioCredentialStatus"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(form: FormData): void {
    startTransition(async () => {
      try {
        await saveDialerCredentials({
          accountSid: form.get("accountSid"),
          authToken: form.get("authToken"),
          apiKeySid: form.get("apiKeySid"),
          apiKeySecret: form.get("apiKeySecret"),
          twimlAppSid: form.get("twimlAppSid"),
          fromNumber: form.get("fromNumber"),
        });
        toast.success("Twilio account connected");
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not connect Twilio account"); }
    });
  }

  function test(): void {
    startTransition(async () => {
      try {
        const result = await testDialerCredentials();
        if (result.ok) toast.success(result.message); else toast.error(result.message);
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not test connection"); }
    });
  }

  function disconnect(): void {
    startTransition(async () => {
      try {
        await disconnectDialerCredentials();
        toast.success("Twilio account disconnected");
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not disconnect"); }
    });
  }

  return <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle className="text-base">Your Twilio account</CardTitle>
      <p className="mt-1 text-xs text-muted-foreground">Calls are billed directly to this Twilio account, not to us. Connect the account, phone number, and TwiML App you own in your own Twilio console.</p>
    </CardHeader>
    <CardContent>
      {status.connected ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.status === "active" ? "default" : "destructive"}>{status.status === "active" ? "Connected" : "Needs reconnect"}</Badge>
            <span className="text-sm text-muted-foreground">{maskAccountSid(status.accountSid ?? "")} · {status.fromNumber}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending} onClick={test}>Test connection</Button>
            <Button variant="outline" disabled={pending} onClick={disconnect}>Disconnect</Button>
          </div>
        </div>
      ) : (
        <form action={save} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="accountSid">Account SID</Label><Input id="accountSid" name="accountSid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required /></div>
          <div className="space-y-2"><Label htmlFor="authToken">Auth Token</Label><Input id="authToken" name="authToken" type="password" required /></div>
          <div className="space-y-2"><Label htmlFor="apiKeySid">API Key SID</Label><Input id="apiKeySid" name="apiKeySid" placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required /></div>
          <div className="space-y-2"><Label htmlFor="apiKeySecret">API Key Secret</Label><Input id="apiKeySecret" name="apiKeySecret" type="password" required /></div>
          <div className="space-y-2"><Label htmlFor="twimlAppSid">TwiML App SID</Label><Input id="twimlAppSid" name="twimlAppSid" placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required /></div>
          <div className="space-y-2"><Label htmlFor="fromNumber">Phone number (E.164)</Label><Input id="fromNumber" name="fromNumber" placeholder="+15551234567" required /></div>
          <Button className="md:col-span-2" disabled={pending} type="submit">Connect Twilio account</Button>
        </form>
      )}
    </CardContent>
  </Card>;
}

export function DialerSettings({ data }: { data: DialerPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const settings = data.settings;
  const [name, setName] = useState("");
  if (!data.isAdmin || !settings) return <p className="rounded-lg border p-8 text-center text-muted-foreground">Owner or admin access is required.</p>;

  function saveSettings(form: FormData): void {
    startTransition(async () => {
      try {
        await updateDialerSettings({
          maxActiveCalls: Number(form.get("maxActiveCalls")),
          maxCallsPerSecond: Number(form.get("maxCallsPerSecond")),
          defaultMaxAttempts: Number(form.get("defaultMaxAttempts")),
          defaultRetryDelaySeconds: Number(form.get("defaultRetryDelaySeconds")),
        });
        toast.success("Dialer settings saved");
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings"); }
    });
  }

  function addDisposition(): void {
    startTransition(async () => {
      try {
        await saveCallDisposition({ name, category: "other", displayOrder: data.dispositions.length * 10 + 100, isActive: true, isRetryable: false, marksDoNotCall: false });
        setName(""); toast.success("Disposition added"); router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add disposition"); }
    });
  }

  return <div className="grid gap-5 lg:grid-cols-2">
    <TwilioAccountCard status={data.twilioCredentialStatus} />
    <Card><CardHeader><CardTitle className="text-base">Concurrency and retries</CardTitle></CardHeader><CardContent><form action={saveSettings} className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label htmlFor="maxActiveCalls">Workspace active calls</Label><Input id="maxActiveCalls" name="maxActiveCalls" type="number" min={1} max={100} defaultValue={settings.max_active_calls} /></div>
      <div className="space-y-2"><Label htmlFor="maxCallsPerSecond">Calls per second</Label><Input id="maxCallsPerSecond" name="maxCallsPerSecond" type="number" min={1} max={20} defaultValue={settings.max_calls_per_second} /></div>
      <div className="space-y-2"><Label htmlFor="defaultMaxAttempts">Default attempts</Label><Input id="defaultMaxAttempts" name="defaultMaxAttempts" type="number" min={1} max={10} defaultValue={settings.default_max_attempts} /></div>
      <div className="space-y-2"><Label htmlFor="defaultRetryDelaySeconds">Retry delay (seconds)</Label><Input id="defaultRetryDelaySeconds" name="defaultRetryDelaySeconds" type="number" min={30} max={86400} defaultValue={settings.default_retry_delay_seconds} /></div>
      <Button className="col-span-2" disabled={pending} type="submit">Save settings</Button>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Call dispositions</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New disposition" maxLength={80} /><Button variant="outline" disabled={!name.trim() || pending} onClick={addDisposition}>Add</Button></div>
      <div className="flex flex-wrap gap-2">{data.dispositions.map((item) => <Badge key={item.id} variant="secondary">{item.name}{item.marks_do_not_call ? " · DNC" : ""}{item.is_retryable ? " · retry" : ""}</Badge>)}</div>
    </CardContent></Card>
  </div>;
}

export function DialerWorkspace({ data }: { data: DialerPageData }) {
  const personal = useMemo(() => data.queues.filter((queue) => queue.owner_user_id === data.userId), [data]);
  const shared = useMemo(() => data.queues.filter((queue) => queue.owner_user_id === null), [data]);

  if (!data.enabled) return <Card><CardContent className="py-12 text-center"><h2 className="font-semibold">Dialer is not enabled</h2><p className="mt-2 text-sm text-muted-foreground">An admin must complete provider setup and set DIALER_ENABLED=true.</p></CardContent></Card>;

  const twilioConnected = data.twilioCredentialStatus.connected && data.twilioCredentialStatus.status === "active";
  const noTwilioMessage = data.isAdmin
    ? "Connect your Twilio account in Settings → Calling to start dialing."
    : "Ask a workspace admin to connect a Twilio account in Settings → Calling.";

  // Keyed on connection state so Base UI's uncontrolled Tabs remounts (and
  // re-reads defaultValue) instead of silently keeping stale internal state
  // when an admin connects/disconnects and router.refresh() swaps the panels.
  return <Tabs key={twilioConnected ? "connected" : "disconnected"} defaultValue="personal">
    <div className="flex flex-wrap items-center justify-between gap-3"><TabsList><TabsTrigger value="personal">Personal</TabsTrigger><TabsTrigger value="shared">Shared</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>{twilioConnected && <CreateQueueDialog data={data} />}</div>
    <TabsContent value="personal" className="space-y-4">{!twilioConnected ? <Card><CardContent className="py-12 text-center"><h2 className="font-semibold">No Twilio account connected</h2><p className="mt-2 text-sm text-muted-foreground">{noTwilioMessage}</p></CardContent></Card> : personal.length ? personal.map((queue) => <QueueCard key={queue.id} queue={queue} data={data} />) : <p className="rounded-lg border p-10 text-center text-muted-foreground">Create a personal queue to start dialing.</p>}</TabsContent>
    <TabsContent value="shared" className="space-y-4">{!twilioConnected ? <Card><CardContent className="py-12 text-center"><h2 className="font-semibold">No Twilio account connected</h2><p className="mt-2 text-sm text-muted-foreground">{noTwilioMessage}</p></CardContent></Card> : shared.length ? shared.map((queue) => <QueueCard key={queue.id} queue={queue} data={data} />) : <p className="rounded-lg border p-10 text-center text-muted-foreground">No shared queues are available.</p>}</TabsContent>
    <TabsContent value="history">{!twilioConnected ? <Card><CardContent className="py-12 text-center"><h2 className="font-semibold">No Twilio account connected</h2><p className="mt-2 text-sm text-muted-foreground">Call history will appear once calls can be placed.</p></CardContent></Card> : <Card><CardContent className="pt-4">{data.history.length ? <Table><TableHeader><TableRow><TableHead>Contact</TableHead><TableHead>Lead</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader><TableBody>{data.history.map((call) => <TableRow key={call.id}><TableCell className="font-medium">{contactName(call.contact)}</TableCell><TableCell>{call.lead?.title ?? "—"}</TableCell><TableCell><Badge variant="secondary">{call.status.replace("_", " ")}</Badge></TableCell><TableCell>{call.attempts.length}</TableCell><TableCell>{call.disposition?.name ?? call.failure_reason ?? "—"}</TableCell></TableRow>)}</TableBody></Table> : <p className="py-10 text-center text-muted-foreground">No call history yet.</p>}</CardContent></Card>}</TabsContent>
  </Tabs>;
}
