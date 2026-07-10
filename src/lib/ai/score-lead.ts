import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAnthropicClient } from "@/lib/ai/client";

const scoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  positives: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});

export type LeadScoreResult = z.infer<typeof scoreResultSchema>;

export interface LeadScoringInput {
  title: string;
  qualificationStatus: string | null;
  value: number | null;
  property: Record<string, string | number | null>;
  activityCounts: Record<string, number>;
  daysSinceCreated: number;
  daysSinceLastActivity: number | null;
}

const SCORE_TOOL_NAME = "score_lead";

const SCORE_TOOL = {
  name: SCORE_TOOL_NAME,
  description:
    "Score a real estate acquisition lead's likelihood to close based on seller intake data and CRM activity history.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: {
        type: "integer",
        description:
          "Likelihood to close, 0-100. 70+ = hot (motivated seller, clear timeline, engaged), 40-69 = warm, below 40 = cold or stale.",
      },
      summary: {
        type: "string",
        description: "One or two sentences explaining the score.",
      },
      positives: {
        type: "array",
        items: { type: "string" },
        description: "Short factors that raise the score, e.g. 'Seller wants to close ASAP'.",
      },
      risks: {
        type: "array",
        items: { type: "string" },
        description: "Short factors that lower the score, e.g. 'No activity in 12 days'.",
      },
    },
    required: ["score", "summary", "positives", "risks"],
  },
};

export async function scoreLead(
  input: LeadScoringInput,
): Promise<LeadScoreResult> {
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [SCORE_TOOL],
    tool_choice: { type: "tool", name: SCORE_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Score this real estate acquisition lead's likelihood to close. Weigh seller motivation, timeline urgency, price expectations, property condition, and how engaged the conversation has been (recent activity beats stale leads).

Lead data (JSON):
${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("AI scoring did not return structured data");
  }

  const parsed = scoreResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("AI scoring returned an unexpected shape");
  }

  return parsed.data;
}
