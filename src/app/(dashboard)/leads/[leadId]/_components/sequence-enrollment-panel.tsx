"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { enrollLeadInSequence, sendCurrentStep } from "@/lib/actions/enrollments";
import type { Tables } from "@/lib/supabase/types";
import type { LeadEnrollment } from "@/lib/queries/sequences";

interface SequenceEnrollmentPanelProps {
  leadId: string;
  enrollments: LeadEnrollment[];
  availableSequences: Tables<"sequences">[];
}

export function SequenceEnrollmentPanel({
  leadId,
  enrollments,
  availableSequences,
}: SequenceEnrollmentPanelProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const enrolledSequenceIds = new Set(enrollments.map((e) => e.sequence_id));
  const selectableSequences = availableSequences.filter(
    (s) => !enrolledSequenceIds.has(s.id),
  );

  function handleEnroll() {
    if (!selectedSequenceId) return;

    startTransition(async () => {
      try {
        await enrollLeadInSequence(leadId, selectedSequenceId);
        toast.success("Enrolled in sequence");
        setSelectedSequenceId(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to enroll",
        );
      }
    });
  }

  function handleSendNow(enrollmentId: string) {
    startTransition(async () => {
      try {
        await sendCurrentStep(enrollmentId);
        toast.success("Step sent");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send step",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{enrollment.sequence.name}</span>
            <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
              {enrollment.status}
            </Badge>
          </div>
          {enrollment.status === "active" && enrollment.currentStep ? (
            <>
              <p className="mt-1 text-muted-foreground">
                Step {enrollment.current_step_number} of {enrollment.totalSteps} —{" "}
                {enrollment.currentStep.channel}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {enrollment.currentStep.body_template}
              </p>
              <Button
                size="sm"
                className="mt-2"
                disabled={isPending || enrollment.currentStep.channel !== "email"}
                onClick={() => handleSendNow(enrollment.id)}
              >
                Send now (manual)
              </Button>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">
              {enrollment.status === "completed"
                ? "All steps sent."
                : "No active step."}
            </p>
          )}
        </div>
      ))}

      {selectableSequences.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedSequenceId ?? undefined}
            onValueChange={(value) => setSelectedSequenceId(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a sequence">
                {(value: string | null) =>
                  (value &&
                    selectableSequences.find((sequence) => sequence.id === value)
                      ?.name) ||
                  "Choose a sequence"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectableSequences.map((sequence) => (
                <SelectItem key={sequence.id} value={sequence.id}>
                  {sequence.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedSequenceId || isPending}
            onClick={handleEnroll}
          >
            Enroll
          </Button>
        </div>
      )}
    </div>
  );
}
