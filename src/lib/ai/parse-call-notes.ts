import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const extractedFieldsSchema = z.object({
  condition: z.string().nullable().optional(),
  updatesDone: z.string().nullable().optional(),
  updatesNeeded: z.string().nullable().optional(),
  occupancyStatus: z.string().nullable().optional(),
  tenantDurationRent: z.string().nullable().optional(),
  askingPrice: z.string().nullable().optional(),
  motivation: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  workNeeded: z.string().nullable().optional(),
  roofCondition: z.string().nullable().optional(),
  flooringCondition: z.string().nullable().optional(),
  kitchenBathCondition: z.string().nullable().optional(),
  mortgage: z.string().nullable().optional(),
  frameSidingCondition: z.string().nullable().optional(),
  windowsCondition: z.string().nullable().optional(),
  basementType: z.string().nullable().optional(),
  wallsCondition: z.string().nullable().optional(),
  electricalPlumbingCondition: z.string().nullable().optional(),
  furnaceCondition: z.string().nullable().optional(),
  waterHeaterCondition: z.string().nullable().optional(),
  acCondition: z.string().nullable().optional(),
  bedrooms: z.string().nullable().optional(),
  bathrooms: z.string().nullable().optional(),
  squareFeet: z.string().nullable().optional(),
  followUpContact: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ExtractedCallNoteFields = z.infer<typeof extractedFieldsSchema>;

const EXTRACT_TOOL_NAME = "extract_property_fields";

const EXTRACT_TOOL = {
  name: EXTRACT_TOOL_NAME,
  description:
    "Extract structured real estate property and seller intake fields from raw call notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      condition: { type: "string", description: "Overall property condition, e.g. Good, Fair, Poor" },
      updatesDone: { type: "string", description: "Recent updates/renovations already completed" },
      updatesNeeded: { type: "string", description: "Updates or repairs still needed" },
      occupancyStatus: { type: "string", description: "e.g. Owner occupied, Tenant occupied, Vacant" },
      tenantDurationRent: { type: "string", description: "Tenant lease duration and rent amount, if tenant occupied" },
      askingPrice: { type: "string", description: "Numeric asking price only, no currency symbols or commas" },
      motivation: { type: "string", description: "Why the seller wants to sell" },
      timeline: { type: "string", description: "How soon the seller wants to close, e.g. ASAP, 30 days" },
      workNeeded: { type: "string", description: "General work/repairs needed on the property" },
      roofCondition: { type: "string" },
      flooringCondition: { type: "string" },
      kitchenBathCondition: { type: "string" },
      mortgage: { type: "string", description: "Mortgage balance or payoff status" },
      frameSidingCondition: { type: "string" },
      windowsCondition: { type: "string" },
      basementType: { type: "string", description: "Full, Partial, or None" },
      wallsCondition: { type: "string" },
      electricalPlumbingCondition: { type: "string" },
      furnaceCondition: { type: "string" },
      waterHeaterCondition: { type: "string" },
      acCondition: { type: "string" },
      bedrooms: { type: "string", description: "Numeric bedroom count only" },
      bathrooms: { type: "string", description: "Numeric bathroom count only" },
      squareFeet: { type: "string", description: "Numeric square footage only" },
      followUpContact: { type: "string", description: "Any named person or instruction for future follow-up" },
      notes: { type: "string", description: "Anything else worth noting that doesn't fit another field" },
    },
    required: [],
  },
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI parsing isn't configured yet. An admin needs to set ANTHROPIC_API_KEY.",
    );
  }

  client ??= new Anthropic({ apiKey });
  return client;
}

export async function parseCallNotes(
  rawText: string,
): Promise<ExtractedCallNoteFields> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Paste some call notes first");
  }

  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Extract property and seller intake fields from these raw cold-call notes. Only fill in fields that are actually mentioned or clearly implied — leave everything else out.\n\nNotes:\n"""\n${trimmed}\n"""`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("AI extraction did not return structured data");
  }

  const parsed = extractedFieldsSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("AI extraction returned an unexpected shape");
  }

  return parsed.data;
}
