import { z } from "zod";

const optionalTime = z
  .string()
  .regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.")
  .transform((value) => value || null);

export const timingTypeSchema = z.enum(["EXACT", "TIME_OF_DAY", "FLEXIBLE"]);
export const timeOfDaySchema = z.enum(["MORNING", "AFTERNOON", "EVENING"]);
export const bookingStatusSchema = z.enum(["NONE", "WISHLIST", "BOOKED"]);
export const paidExtraTypeSchema = z.enum(["", "LIGHTNING_LANE", "SPECIAL_EVENT", "OTHER"]);

export const dayPlanItemSchema = z
  .object({
    id: z.string().cuid().optional(),
    dayPlanId: z.string().cuid(),
    entityId: z.string().trim().min(1, "Choose an item."),
    entityType: z.enum(["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"]),
    title: z.string().trim().min(1, "Enter a title.").max(150),
    timingType: timingTypeSchema.default("FLEXIBLE"),
    timeOfDay: z.union([timeOfDaySchema, z.literal("")]).optional().transform((value) => value || null),
    startTime: optionalTime,
    endTime: optionalTime,
    estimatedCost: z
      .string()
      .trim()
      .refine((value) => value === "" || /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value), "Enter a valid cost."),
    notes: z.string().trim().max(1_000).transform((value) => value || null),
    bookingStatus: bookingStatusSchema.default("NONE"),
    confirmationNumber: z.string().trim().max(100).transform((value) => value || null),
    partySizeOverride: z.union([z.literal(""), z.coerce.number().int().min(1).max(50)]).transform((value) => value === "" ? null : value),
    backupNote: z.string().trim().max(500).transform((value) => value || null),
    paidExtraType: paidExtraTypeSchema.transform((value) => value || null),
  })
  .superRefine(({ timingType, timeOfDay, startTime, endTime }, context) => {
    if (timingType === "EXACT" && !startTime) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["startTime"], message: "Choose the fixed start time." });
    }
    if (timingType === "TIME_OF_DAY" && !timeOfDay) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["timeOfDay"], message: "Choose morning, afternoon, or evening." });
    }
    if (startTime && endTime && endTime <= startTime) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time must be after start time." });
    }
  });

export const parkAssignmentSchema = z.object({
  dayPlanId: z.string().cuid(),
  parkId: z.string().trim().nullable(),
});

export const secondaryParkAssignmentSchema = z.object({
  dayPlanId: z.string().cuid(),
  secondaryParkId: z.string().trim().nullable(),
});

export const mustDoSchema = z.object({
  id: z.string().cuid().optional(),
  tripId: z.string().cuid(),
  title: z.string().trim().min(1, "Enter a must-do.").max(150),
  entityId: z.string().trim().max(150).optional().transform((value) => value || null),
  entityType: z.enum(["ATTRACTION", "RESTAURANT", "SHOW", "EXPERIENCE"]).optional().nullable(),
  notes: z.string().trim().max(500).transform((value) => value || null),
  priority: z.coerce.number().int().min(1).max(3),
});

export const assignMustDoSchema = z.object({ mustDoId: z.string().cuid(), dayPlanId: z.string().cuid() });
export const curatedPlanSchema = z.object({
  dayPlanId: z.string().cuid(),
  planId: z.string().trim().min(1).max(80),
});

export const itemMutationSchema = z.object({
  itemId: z.string().cuid(),
  direction: z.enum(["up", "down"]).optional(),
});

export type DayPlanItemInput = z.input<typeof dayPlanItemSchema>;
