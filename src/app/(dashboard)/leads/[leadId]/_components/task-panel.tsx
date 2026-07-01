"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeadTask, completeLeadTask } from "@/lib/actions/tasks";
import type { MemberProfile } from "@/lib/queries/members";
import type { LeadTask } from "@/lib/queries/tasks";

interface TaskPanelProps {
  leadId: string;
  tasks: LeadTask[];
  members: MemberProfile[];
}

const UNASSIGNED = "__self__";

function dateTimeInputValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function priorityVariant(priority: string): "default" | "secondary" | "outline" {
  if (priority === "high") return "default";
  if (priority === "low") return "outline";
  return "secondary";
}

export function TaskPanel({ leadId, tasks, members }: TaskPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(dateTimeInputValue());
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [assignedUserId, setAssignedUserId] = useState(UNASSIGNED);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [nextTitle, setNextTitle] = useState("");
  const [nextDueAt, setNextDueAt] = useState(dateTimeInputValue());
  const [nextPriority, setNextPriority] = useState<"low" | "normal" | "high">(
    "normal",
  );
  const [nextAssignedUserId, setNextAssignedUserId] = useState(UNASSIGNED);

  const openTasks = tasks.filter((task) => !task.completed_at);
  const completedTasks = tasks.filter((task) => task.completed_at);

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setDueAt(dateTimeInputValue());
    setPriority("normal");
    setAssignedUserId(UNASSIGNED);
  }

  function resetCompleteForm() {
    setCompletingTaskId(null);
    setCompletionNote("");
    setNextTitle("");
    setNextDueAt(dateTimeInputValue());
    setNextPriority("normal");
    setNextAssignedUserId(UNASSIGNED);
  }

  function submitTask() {
    startTransition(async () => {
      try {
        await createLeadTask(leadId, {
          title,
          description,
          dueAt,
          priority,
          assignedUserId: assignedUserId === UNASSIGNED ? "" : assignedUserId,
        });
        resetCreateForm();
        toast.success("Task created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create task");
      }
    });
  }

  function submitCompleteTask(taskId: string) {
    startTransition(async () => {
      try {
        await completeLeadTask(taskId, {
          completionNote,
          nextTitle,
          nextDueAt,
          nextPriority,
          nextAssignedUserId:
            nextAssignedUserId === UNASSIGNED ? "" : nextAssignedUserId,
        });
        resetCompleteForm();
        toast.success("Task completed and next step scheduled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to complete task");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_12rem_7rem]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Next action"
        />
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        <Select
          value={priority}
          onValueChange={(value) => value && setPriority(value as typeof priority)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Task details"
          className="min-h-16"
        />
        <Select
          value={assignedUserId}
          onValueChange={(value) => value && setAssignedUserId(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string) =>
                value === UNASSIGNED
                  ? "Assign to me"
                  : (members.find((member) => member.userId === value)?.email ??
                    "Member")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Assign to me</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={submitTask} disabled={isPending}>
          Add task
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          openTasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-3 py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {new Date(task.due_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={priorityVariant(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCompletingTaskId(task.id);
                      setNextTitle("");
                      setNextDueAt(dateTimeInputValue());
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Complete
                  </Button>
                </div>
              </div>

              {completingTaskId === task.id && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid gap-2">
                    <Textarea
                      value={completionNote}
                      onChange={(event) => setCompletionNote(event.target.value)}
                      placeholder="Completion note"
                      className="min-h-16"
                    />
                    <div className="grid gap-2 md:grid-cols-[1fr_12rem_7rem]">
                      <Input
                        value={nextTitle}
                        onChange={(event) => setNextTitle(event.target.value)}
                        placeholder="Required next step"
                      />
                      <Input
                        type="datetime-local"
                        value={nextDueAt}
                        onChange={(event) => setNextDueAt(event.target.value)}
                      />
                      <Select
                        value={nextPriority}
                        onValueChange={(value) =>
                          value && setNextPriority(value as typeof nextPriority)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={nextAssignedUserId}
                        onValueChange={(value) =>
                          value && setNextAssignedUserId(value)
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue>
                            {(value: string) =>
                              value === UNASSIGNED
                                ? "Assign next to me"
                                : (members.find((member) => member.userId === value)
                                    ?.email ?? "Member")
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Assign next to me</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.userId} value={member.userId}>
                              {member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={resetCompleteForm}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => submitCompleteTask(task.id)}
                          disabled={isPending}
                        >
                          Complete + schedule next
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Completed recently
          </p>
          {completedTasks.slice(0, 4).map((task) => (
            <div key={task.id} className="text-sm text-muted-foreground">
              {task.title} · {new Date(task.completed_at ?? task.updated_at).toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
