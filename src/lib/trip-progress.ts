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
  const assignedDays = input.days.filter((day) => Boolean(day.parkId)).length;
  const framedDays = input.days.filter((day) => Boolean(day.parkId || day.notes?.trim() || itemCount(day))).length;
  const plannedDays = input.days.filter((day) => itemCount(day) > 0).length;
  const parkDays = input.days.filter((day) => Boolean(day.parkId));
  const plannedParkDays = parkDays.filter((day) => itemCount(day) > 0).length;
  const reservationItems = input.days.flatMap((day) => typeof day.items === "number" ? [] : day.items).filter((item) => item.bookingStatus === "WISHLIST" || item.bookingStatus === "BOOKED");
  const openReservations = reservationItems.filter((item) => item.bookingStatus === "WISHLIST").length;
  const bookedReservations = reservationItems.length - openReservations;

  const ratios = {
    framework: totalDays ? framedDays / totalDays : 0,
    itinerary: parkDays.length ? plannedParkDays / parkDays.length : 0,
    reservations: reservationItems.length ? bookedReservations / reservationItems.length : 1,
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

  const firstUnframed = input.days.find((day) => !day.parkId && !day.notes?.trim() && itemCount(day) === 0);
  const firstEmptyParkDay = input.days.find((day) => day.parkId && itemCount(day) === 0);
  let nextAction: TripProgress["nextAction"];
  if (assignedDays === 0) {
    nextAction = { title: "Build your day framework", description: "Choose a park or mark out a relaxed resort day.", dayId: input.days[0]?.id };
  } else if (firstUnframed) {
    nextAction = { title: "Shape the next open day", description: "Give every day a park, a note, or a simple plan.", dayId: firstUnframed.id };
  } else if (input.mustDoCount === 0) {
    nextAction = { title: "Capture the family must-dos", description: "Add the moments nobody wants to miss.", dayId: input.days[0]?.id };
  } else if (firstEmptyParkDay) {
    nextAction = { title: "Add a plan to a park day", description: "A few anchors are enough—leave room to be flexible.", dayId: firstEmptyParkDay.id };
  } else if (openReservations > 0) {
    nextAction = { title: `Confirm ${openReservations} open reservation${openReservations === 1 ? "" : "s"}`, description: "Update dining wishes once they are booked.", dayId: input.days.find((day) => typeof day.items !== "number" && day.items.some((item) => item.bookingStatus === "WISHLIST"))?.id };
  } else if (!input.hasPartyProfile) {
    nextAction = { title: "Add party preferences", description: "Ages, accessibility, and food notes make every suggestion better." };
  } else {
    nextAction = { title: "Review the plan together", description: "Your trip has a strong shape. Share it with the family." };
  }

  const completedSteps = [input.hotelId, input.budgetCents !== null, input.hasPartyProfile, input.mustDoCount > 0, ratios.framework === 1, parkDays.length > 0 && ratios.itinerary === 1, openReservations === 0].filter(Boolean).length;
  const label = score >= 85 ? "Ready for magic" : score >= 65 ? "Nearly ready" : score >= 35 ? "Taking shape" : "Getting started";

  return { score, label, completedSteps, totalSteps: 7, nextAction, stats: { assignedDays, plannedDays, totalDays, openReservations } };
}
