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
  customHotelName: z.string().trim().max(120, "Hotel name must be 120 characters or fewer.").nullable().optional(),
}).refine((value) => !(value.hotelId && value.customHotelName), { message: "Choose a directory hotel or enter a custom hotel, not both." });

const timeSchema = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.")]);

export const reservationSchema = tripIdSchema.extend({
  id: z.string().cuid().optional(),
  dayPlanId: z.union([z.literal(""), z.string().cuid()]),
  category: z.enum(["HOTEL", "DINING", "FLIGHT", "TRANSPORT", "TICKET", "EVENT", "OTHER"]),
  title: z.string().trim().min(1, "Give this reservation a name.").max(140),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  startTime: timeSchema,
  endTime: timeSchema,
  status: z.enum(["CONFIRMED", "PENDING", "WISHLIST"]),
  confirmationNumber: z.string().trim().max(120),
  location: z.string().trim().max(200),
  notes: z.string().trim().max(1_000),
  estimatedCost: z.union([z.literal(""), z.coerce.number().min(0).max(1_000_000)]),
  partySize: z.union([z.literal(""), z.coerce.number().int().min(1).max(50)]),
}).refine((value) => !value.endTime || !value.startTime || value.endTime >= value.startTime, { path: ["endTime"], message: "End time must be after the start time." });

export const companionSchema = tripIdSchema.extend({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(100),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.").max(200)]),
  role: z.enum(["CO_PLANNER", "TRAVELER", "CHILD"]),
  rsvp: z.enum(["GOING", "INVITED", "MAYBE"]),
});

export const reservationMutationSchema = z.object({ reservationId: z.string().cuid() });
export const companionMutationSchema = z.object({ companionId: z.string().cuid() });

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
