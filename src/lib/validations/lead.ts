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
  // Acquisition intake fields (call-script order): condition, occupancy,
  // financials, timeline, then system-by-system condition detail.
  condition: z.string().optional(),
  updatesDone: z.string().optional(),
  updatesNeeded: z.string().optional(),
  occupancyStatus: z.string().optional(),
  tenantDurationRent: z.string().optional(),
  motivation: z.string().optional(),
  timeline: z.string().optional(),
  workNeeded: z.string().optional(),
  roofCondition: z.string().optional(),
  flooringCondition: z.string().optional(),
  kitchenBathCondition: z.string().optional(),
  mortgage: z.string().optional(),
  frameSidingCondition: z.string().optional(),
  windowsCondition: z.string().optional(),
  basementType: z.string().optional(),
  wallsCondition: z.string().optional(),
  electricalPlumbingCondition: z.string().optional(),
  furnaceCondition: z.string().optional(),
  waterHeaterCondition: z.string().optional(),
  acCondition: z.string().optional(),
  followUpContact: z.string().optional(),
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

export const previewCsvMappingSchema = z.object({
  csvText: z.string().min(1, "CSV content is required"),
});

export type PreviewCsvMappingInput = z.infer<typeof previewCsvMappingSchema>;

export const importLeadsCsvMappedSchema = z.object({
  csvText: z.string().min(1, "CSV content is required"),
  mapping: z.record(z.string(), z.string()),
  pipelineStageId: z.string().uuid("Select a stage").optional().or(z.literal("")),
  fallbackSource: z.string().optional(),
});

export type ImportLeadsCsvMappedInput = z.infer<typeof importLeadsCsvMappedSchema>;

// Caller quick-intake: script-speed submission for cold callers. Only the
// seller's phone and property address are required so a caller doing
// hundreds of dials a day is never blocked from submitting a lead.
export const callerIntakeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  addressLine1: z.string().min(1, "Property address is required"),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  property: leadPropertySchema.omit({
    addressLine1: true,
    addressLine2: true,
    city: true,
    state: true,
    postalCode: true,
    contractStatus: true,
    contractAmount: true,
    contractCloseDate: true,
  }).partial(),
});

export type CallerIntakeInput = z.infer<typeof callerIntakeSchema>;
export type CallerIntakeFormInput = z.input<typeof callerIntakeSchema>;

export const rejectLeadSchema = z.object({
  reason: z.string().trim().min(1, "A rejection reason is required").max(500),
});

export type RejectLeadInput = z.infer<typeof rejectLeadSchema>;

export const requestLeadInfoSchema = z.object({
  note: z.string().trim().min(1, "Explain what's missing").max(1000),
});

export type RequestLeadInfoInput = z.infer<typeof requestLeadInfoSchema>;
