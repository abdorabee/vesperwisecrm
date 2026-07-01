import { z } from "zod";

export const contractStatusSchema = z.enum([
  "none",
  "offered",
  "under_contract",
  "closed",
  "cancelled",
]);

const optionalNonNegativeNumberString = z
  .string()
  .optional()
  .refine(
    (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Must be a positive number",
  );

export const leadPropertySchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  propertyType: z.string().optional(),
  bedrooms: optionalNonNegativeNumberString,
  bathrooms: optionalNonNegativeNumberString,
  squareFeet: optionalNonNegativeNumberString,
  askingPrice: optionalNonNegativeNumberString,
  estimatedValue: optionalNonNegativeNumberString,
  contractStatus: contractStatusSchema.default("none"),
  contractAmount: optionalNonNegativeNumberString,
  contractCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export const newLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: optionalNonNegativeNumberString,
  pipelineStageId: z.string().uuid("Select a stage"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  property: leadPropertySchema.optional(),
});

export type NewLeadInput = z.infer<typeof newLeadSchema>;
export type NewLeadFormInput = z.input<typeof newLeadSchema>;
export type LeadPropertyInput = z.infer<typeof leadPropertySchema>;
export type LeadPropertyFormInput = z.input<typeof leadPropertySchema>;

export const addLeadNoteSchema = z.object({
  note: z.string().trim().min(1, "Note is required").max(5000, "Note is too long"),
});

export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;

export const intakeLeadSchema = newLeadSchema
  .omit({ pipelineStageId: true })
  .extend({
    accountId: z.string().uuid("Account is required"),
    pipelineStageId: z.string().uuid("Invalid stage").optional(),
    value: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value == null ? undefined : String(value))),
  });

export type IntakeLeadInput = z.infer<typeof intakeLeadSchema>;

export const importLeadsCsvSchema = z.object({
  csvText: z.string().min(1, "CSV content is required"),
  pipelineStageId: z.string().uuid("Select a stage").optional().or(z.literal("")),
  fallbackSource: z.string().optional(),
});

export type ImportLeadsCsvInput = z.infer<typeof importLeadsCsvSchema>;
