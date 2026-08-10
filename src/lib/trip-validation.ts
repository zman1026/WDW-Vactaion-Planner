import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string) {
  if (!datePattern.test(value)) return false;

  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const tripDetailsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give your trip a name.")
      .max(100, "Trip name must be 100 characters or fewer."),
    startDate: z.string().refine(isCalendarDate, "Choose a valid start date."),
    endDate: z.string().refine(isCalendarDate, "Choose a valid end date."),
    budget: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value === undefined ? "" : String(value).trim()))
      .refine(
        (value) => value === "" || /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value),
        "Enter a valid budget with no more than two decimal places.",
      )
      .refine(
        (value) => value === "" || Number(value) <= 10_000_000,
        "Budget must be $10,000,000 or less.",
      ),
    notes: z
      .string()
      .trim()
      .max(2_000, "Notes must be 2,000 characters or fewer.")
      .optional()
      .default(""),
  });

export const createTripSchema = tripDetailsSchema.superRefine(({ startDate, endDate }, context) => {
    if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) return;

    if (endDate < startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }

    const duration =
      (Date.parse(`${endDate}T12:00:00.000Z`) -
        Date.parse(`${startDate}T12:00:00.000Z`)) /
      86_400_000;

    if (duration > 60) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Trips can be up to 61 days long.",
      });
    }
  });

export type CreateTripInput = z.input<typeof createTripSchema>;

export function calendarDateToUtc(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function budgetToCents(value: string) {
  return value === "" ? null : Math.round(Number(value) * 100);
}
