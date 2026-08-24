export type ProgressDay = {
  id: string;
  parkId: string | null;
  notes?: string | null;
  items: Array<{ bookingStatus?: string | null }> | number;
};

export type TripProgressInput = {
  hotelId: string | null;
  budgetCents: number | null;
  hasPartyProfile: boolean;
  mustDoCount: number;
  days: ProgressDay[];
  reservations?: Array<{ status: string; dayPlanId?: string | null }>;
};

export type TripProgress = {
  score: number;
  label: "Getting started" | "Taking shape" | "Nearly ready" | "Ready for magic";
  completedSteps: number;
  totalSteps: number;
  nextAction: { title: string; description: string; dayId?: string };
  stats: {
    assignedDays: number;
    plannedDays: number;
    totalDays: number;
    openReservations: number;
  };
};

function itemCount(day: ProgressDay) {
  return typeof day.items === "number" ? day.items : day.items.length;
}

export function calculateTripProgress(input: TripProgressInput): TripProgress {
  const totalDays = input.days.length;
  const reservationDayIds = new Set(input.reservations?.map((reservation) => reservation.dayPlanId).filter((id): id is string => Boolean(id)) ?? []);
  const hasPlan = (day: ProgressDay) => itemCount(day) > 0 || reservationDayIds.has(day.id);
  const assignedDays = input.days.filter((day) => Boolean(day.parkId)).length;
  const framedDays = input.days.filter((day) => Boolean(day.parkId || day.notes?.trim() || hasPlan(day))).length;
  const plannedDays = input.days.filter(hasPlan).length;
  const parkDays = input.days.filter((day) => Boolean(day.parkId));
  const plannedParkDays = parkDays.filter(hasPlan).length;
  const plannedBookings = input.days.flatMap((day) => typeof day.items === "number" ? [] : day.items).filter((item) => item.bookingStatus === "WISHLIST" || item.bookingStatus === "BOOKED");
  const directReservations = input.reservations ?? [];
  const openReservations = plannedBookings.filter((item) => item.bookingStatus === "WISHLIST").length + directReservations.filter((item) => item.status !== "CONFIRMED").length;
  const bookedReservations = plannedBookings.filter((item) => item.bookingStatus === "BOOKED").length + directReservations.filter((item) => item.status === "CONFIRMED").length;
  const reservationCount = openReservations + bookedReservations;

  const ratios = {
    framework: totalDays ? framedDays / totalDays : 0,
    itinerary: parkDays.length ? plannedParkDays / parkDays.length : 0,
    reservations: reservationCount ? bookedReservations / reservationCount : 1,
  };
  const score = Math.round(
    (input.hotelId ? 10 : 0) +
    (input.budgetCents !== null ? 5 : 0) +
    (input.hasPartyProfile ? 10 : 0) +
    (input.mustDoCount > 0 ? 10 : 0) +
    ratios.framework * 30 +
    ratios.itinerary * 25 +
    ratios.reservations * 10,
  );

  const firstUnframed = input.days.find((day) => !day.parkId && !day.notes?.trim() && !hasPlan(day));
  const firstEmptyParkDay = input.days.find((day) => day.parkId && !hasPlan(day));
  let nextAction: TripProgress["nextAction"];
  if (assignedDays === 0) {
    nextAction = { title: "Choose a plan for the first day", description: "Pick a park or make it a relaxed resort day.", dayId: input.days[0]?.id };
  } else if (firstUnframed) {
    nextAction = { title: "Plan the next open day", description: "Choose a park, a resort day, or add a simple note.", dayId: firstUnframed.id };
  } else if (input.mustDoCount === 0) {
    nextAction = { title: "Add your family’s must-dos", description: "List the moments nobody wants to miss.", dayId: input.days[0]?.id };
  } else if (firstEmptyParkDay) {
    nextAction = { title: "Add a plan to a park day", description: "A few anchors are enough—leave room to be flexible.", dayId: firstEmptyParkDay.id };
  } else if (openReservations > 0) {
    nextAction = { title: `Confirm ${openReservations} open reservation${openReservations === 1 ? "" : "s"}`, description: "Update wish-list and pending bookings once they are settled.", dayId: input.days.find((day) => (typeof day.items !== "number" && day.items.some((item) => item.bookingStatus === "WISHLIST")) || input.reservations?.some((reservation) => reservation.dayPlanId === day.id && reservation.status !== "CONFIRMED"))?.id };
  } else if (!input.hasPartyProfile) {
    nextAction = { title: "Add party preferences", description: "Ages, accessibility, and food notes make every suggestion better." };
  } else {
    nextAction = { title: "Review the plan together", description: "Your trip has a strong shape. Share it with the family." };
  }

  const completedSteps = [input.hotelId, input.budgetCents !== null, input.hasPartyProfile, input.mustDoCount > 0, ratios.framework === 1, parkDays.length > 0 && ratios.itinerary === 1, openReservations === 0].filter(Boolean).length;
  const label = score >= 85 ? "Ready for magic" : score >= 65 ? "Nearly ready" : score >= 35 ? "Taking shape" : "Getting started";

  return { score, label, completedSteps, totalSteps: 7, nextAction, stats: { assignedDays, plannedDays, totalDays, openReservations } };
}
