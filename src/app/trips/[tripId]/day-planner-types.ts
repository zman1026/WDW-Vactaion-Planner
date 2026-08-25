export type ParkOption = { id: string; name: string };

export type DayOption = { id: string; label: string };

export type PickType = "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE";

export type PlanItem = {
  id: string;
  entityId: string;
  entityType: string;
  title: string;
  timingType: string;
  timeOfDay: string | null;
  startTime: string | null;
  endTime: string | null;
  estimatedCostCents: number | null;
  notes: string | null;
  bookingStatus: string;
  confirmationNumber: string | null;
  partySizeOverride: number | null;
  backupNote: string | null;
  paidExtraType: string | null;
};

export type DayActionRunner = (action: () => Promise<void>, after?: () => void) => void;

export function entityTypeLabel(value: string) {
  return ({
    ATTRACTION: "Attraction",
    RESTAURANT: "Dining",
    SHOW: "Show",
    EXPERIENCE: "Experience",
  } as Record<string, string>)[value] ?? "Item";
}

export function reservationCategoryLabel(value: string) {
  return ({
    DINING: "Dining",
    HOTEL: "Hotel",
    FLIGHT: "Flight",
    TRANSPORT: "Transportation",
    TICKET: "Tickets",
    EVENT: "Special event",
    OTHER: "Booking",
  } as Record<string, string>)[value] ?? "Booking";
}

export function timingDescription(item: Pick<PlanItem, "timingType" | "timeOfDay" | "startTime">) {
  if (item.timingType === "EXACT" && item.startTime) return clock(item.startTime);
  if (item.timingType === "TIME_OF_DAY" && item.timeOfDay) return titleCase(item.timeOfDay);
  return "Flexible";
}

export function clock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}

export function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
