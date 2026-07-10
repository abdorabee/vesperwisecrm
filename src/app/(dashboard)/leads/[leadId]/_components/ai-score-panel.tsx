"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { scoreLeadAction } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Json } from "@/lib/supabase/types";

interface AiScorePanelProps {
  leadId: string;
  score: number | null;
  factors: Json | null;
  scoredAt: string | null;
}

interface ScoreFactors {
  summary: string | null;
  positives: string[];
  risks: string[];
}

const HOT_THRESHOLD = 70;
const WARM_THRESHOLD = 40;

function parseFactors(factors: Json | null): ScoreFactors {
  if (!factors || typeof factors !== "object" || Array.isArray(factors)) {
    return { summary: null, positives: [], risks: [] };
  }
  const record = factors as Record<string, unknown>;
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  return {
    summary: typeof record.summary === "string" ? record.summary : null,
    positives: toStringArray(record.positives),
    risks: toStringArray(record.risks),
  };
}

function scoreTone(score: number): {
  label: string;
  className: string;
} {
  if (score >= HOT_THRESHOLD) {
    return {
      label: "Hot",
      className:
        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    };
  }
  if (score >= WARM_THRESHOLD) {
    return {
      label: "Warm",
      className:
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    };
  }
  return {
    label: "Cold",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30",
  };
}

export function AiScorePanel({
  leadId,
  score,
  factors,
  scoredAt,
}: AiScorePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [latest, setLatest] = useState<{
    score: number;
    factors: ScoreFactors;
    scoredAt: string;
  } | null>(null);

  const currentScore = latest?.score ?? score;
  const currentFactors = latest?.factors ?? parseFactors(factors);
  const currentScoredAt = latest?.scoredAt ?? scoredAt;

  function handleScore() {
    startTransition(async () => {
      try {
        const result = await scoreLeadAction(leadId);
        setLatest({
          score: result.score,
          factors: {
            summary: result.summary,
            positives: result.positives,
            risks: result.risks,
          },
          scoredAt: new Date().toISOString(),
        });
        toast.success(`Lead scored ${result.score}/100`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to score lead",
        );
      }
    });
  }

  const tone = currentScore == null ? null : scoreTone(currentScore);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {currentScore != null && tone && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 tabular-nums",
              tone.className,
            )}
          >
            {tone.label} · {currentScore}/100
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleScore}
          disabled={isPending}
        >
          <Sparkles className="size-4" />
          {isPending
            ? "Scoring…"
            : currentScore == null
              ? "Score with AI"
              : "Re-score"}
        </Button>
      </div>
      {currentFactors.summary && (
        <p className="text-sm text-muted-foreground">
          {currentFactors.summary}
        </p>
      )}
      {(currentFactors.positives.length > 0 ||
        currentFactors.risks.length > 0) && (
        <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {currentFactors.positives.map((factor) => (
            <li key={`plus-${factor}`}>
              <span className="text-emerald-600 dark:text-emerald-400">+</span>{" "}
              {factor}
            </li>
          ))}
          {currentFactors.risks.map((factor) => (
            <li key={`risk-${factor}`}>
              <span className="text-red-600 dark:text-red-400">−</span> {factor}
            </li>
          ))}
        </ul>
      )}
      {currentScoredAt && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Last scored {new Date(currentScoredAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
