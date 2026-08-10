import { z } from "zod";

import { tripDetailsSchema } from "@/lib/trip-validation";

export const updateTripSchema = tripDetailsSchema.extend({ tripId: z.string().cuid() }).superRefine(({ startDate, endDate }, context) => {
  if (endDate < startDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be on or after the start date." });
  const duration = (Date.parse(`${endDate}T12:00:00.000Z`) - Date.parse(`${startDate}T12:00:00.000Z`)) / 86_400_000;
  if (duration > 60) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "Trips can be up to 61 days long." });
});

export const tripIdSchema = z.object({ tripId: z.string().cuid() });

export const hotelAssignmentSchema = tripIdSchema.extend({
  hotelId: z.string().trim().nullable(),
});

export const partyProfileSchema = tripIdSchema.extend({
  partySize: z.coerce.number().int().min(1, "Party size must be at least 1.").max(50, "Party size must be 50 or fewer."),
  ages: z.string().trim().max(300, "Age details must be 300 characters or fewer."),
  dietaryNotes: z.string().trim().max(1_000, "Dietary notes must be 1,000 characters or fewer."),
  accessibilityNotes: z.string().trim().max(1_000, "Accessibility notes must be 1,000 characters or fewer."),
  mustDos: z.string().trim().max(1_000, "Must-dos must be 1,000 characters or fewer."),
  avoidList: z.string().trim().max(1_000, "Avoid list must be 1,000 characters or fewer."),
});

export const copyDaySchema = z.object({
  sourceDayPlanId: z.string().cuid(),
  targetDayPlanId: z.string().cuid(),
}).refine((value) => value.sourceDayPlanId !== value.targetDayPlanId, { path: ["targetDayPlanId"], message: "Choose a different day." });

export const clearDaySchema = z.object({ dayPlanId: z.string().cuid() });

export type PartyProfile = Omit<z.output<typeof partyProfileSchema>, "tripId">;
