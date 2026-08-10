import { z } from "zod";

export const suggestionRequestSchema = z.object({
  dayPlanId: z.string().cuid(),
  preferences: z.string().trim().max(1_000).default(""),
});

export const suggestionItemSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"]),
  title: z.string().min(1).max(150),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  estimatedCostCents: z.number().int().min(0).max(1_000_000),
  notes: z.string().max(500),
  reason: z.string().min(1).max(300),
});

export const suggestionResponseSchema = z.object({ summary: z.string().max(500), items: z.array(suggestionItemSchema).min(1).max(8) });
export type SuggestedItem = z.infer<typeof suggestionItemSchema>;
