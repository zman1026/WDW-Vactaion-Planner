export type DayThemeId =
  | "mk"
  | "epcot"
  | "hs"
  | "ak"
  | "rest"
  | "hotel-victorian"
  | "hotel-modern"
  | "hotel-tropical"
  | "hotel-wilderness"
  | "hotel-coastal"
  | "hotel-savanna";

export type DayTheme = {
  id: DayThemeId;
  label: string;
  accent: string;
  wash: string;
  eyebrow: string;
  emptyTitle: string;
  emptyDescription: string;
  pattern: "sparkle" | "geometry" | "stage" | "organic" | "breeze";
};

export const DAY_THEMES: Record<DayThemeId, DayTheme> = {
  mk: {
    id: "mk",
    label: "Magic Kingdom",
    accent: "180 139 50",
    wash: "255 249 235",
    eyebrow: "A day for bright wishes",
    emptyTitle: "No plans yet for this Magic Kingdom day",
    emptyDescription: "Begin with one must-do, then leave room for the happy surprises in between.",
    pattern: "sparkle",
  },
  epcot: {
    id: "epcot",
    label: "EPCOT",
    accent: "28 125 126",
    wash: "239 250 248",
    eyebrow: "A day of discovery",
    emptyTitle: "Your EPCOT day is wide open",
    emptyDescription: "Sketch a calm route through discoveries, flavors, and an evening worth lingering for.",
    pattern: "geometry",
  },
  hs: {
    id: "hs",
    label: "Hollywood Studios",
    accent: "157 74 95",
    wash: "253 242 245",
    eyebrow: "Your day in the spotlight",
    emptyTitle: "Set the scene for your Studios day",
    emptyDescription: "Add a headliner, a showtime, or a memorable meal to start the story.",
    pattern: "stage",
  },
  ak: {
    id: "ak",
    label: "Animal Kingdom",
    accent: "73 118 76",
    wash: "242 248 238",
    eyebrow: "Follow the wild path",
    emptyTitle: "Your Animal Kingdom trail is open",
    emptyDescription: "Choose an early adventure and let the day unfold at a gentler, wandering pace.",
    pattern: "organic",
  },
  rest: {
    id: "rest",
    label: "Resort day",
    accent: "119 109 96",
    wash: "248 245 239",
    eyebrow: "Room to slow down",
    emptyTitle: "A quiet resort day",
    emptyDescription: "Add pool time, a relaxed meal, or simply keep the day beautifully unplanned.",
    pattern: "breeze",
  },
  "hotel-victorian": {
    id: "hotel-victorian",
    label: "Resort day",
    accent: "153 112 46",
    wash: "255 249 238",
    eyebrow: "A gracious day at the resort",
    emptyTitle: "An elegant day with nowhere to rush",
    emptyDescription: "Add tea, a leisurely meal, or time by the water—or leave the day open.",
    pattern: "sparkle",
  },
  "hotel-modern": {
    id: "hotel-modern",
    label: "Resort day",
    accent: "62 113 145",
    wash: "240 248 252",
    eyebrow: "A fresh change of pace",
    emptyTitle: "A cool, easy resort day",
    emptyDescription: "Make space for the pool, a nearby meal, and an unhurried evening.",
    pattern: "geometry",
  },
  "hotel-tropical": {
    id: "hotel-tropical",
    label: "Resort day",
    accent: "32 126 117",
    wash: "239 251 247",
    eyebrow: "Settle into island time",
    emptyTitle: "A breezy resort day",
    emptyDescription: "Add a swim, something delicious, or a sunset stroll—and keep the pace light.",
    pattern: "breeze",
  },
  "hotel-wilderness": {
    id: "hotel-wilderness",
    label: "Resort day",
    accent: "86 105 68",
    wash: "245 247 237",
    eyebrow: "A slower day in the pines",
    emptyTitle: "A restful wilderness day",
    emptyDescription: "Plan a trail, a cozy meal, or a long pause by the water.",
    pattern: "organic",
  },
  "hotel-coastal": {
    id: "hotel-coastal",
    label: "Resort day",
    accent: "51 116 139",
    wash: "240 249 251",
    eyebrow: "A day along the water",
    emptyTitle: "A relaxed waterside day",
    emptyDescription: "Add a swim, a boardwalk wander, or dinner close to home.",
    pattern: "breeze",
  },
  "hotel-savanna": {
    id: "hotel-savanna",
    label: "Resort day",
    accent: "102 105 57",
    wash: "248 247 235",
    eyebrow: "Take the scenic route",
    emptyTitle: "A resort day inspired by the wild",
    emptyDescription: "Leave time to look, listen, share a meal, and enjoy the view.",
    pattern: "organic",
  },
};

const HOTEL_THEME_RULES: Array<[RegExp, DayThemeId]> = [
  [/grand floridian|saratoga springs|old key west/i, "hotel-victorian"],
  [/contemporary|bay lake tower|riviera|swan|dolphin/i, "hotel-modern"],
  [/polynesian|caribbean beach|coronado springs/i, "hotel-tropical"],
  [/wilderness lodge|fort wilderness|copper creek|boulder ridge/i, "hotel-wilderness"],
  [/beach club|yacht club|boardwalk|port orleans/i, "hotel-coastal"],
  [/animal kingdom lodge|kidani|jambo/i, "hotel-savanna"],
];

export function parkThemeId(name?: string | null): DayThemeId | null {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("magic kingdom")) return "mk";
  if (normalized.includes("epcot")) return "epcot";
  if (normalized.includes("hollywood")) return "hs";
  if (normalized.includes("animal kingdom")) return "ak";
  return null;
}

export function hotelThemeId(name?: string | null): DayThemeId {
  if (!name) return "rest";
  return HOTEL_THEME_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? "rest";
}

export function resolveDayTheme({ parkName, hotelName }: { parkName?: string | null; hotelName?: string | null }) {
  const id = parkThemeId(parkName) ?? hotelThemeId(hotelName);
  const theme = DAY_THEMES[id];
  return {
    ...theme,
    displayName: parkName || hotelName || theme.label,
    isParkDay: Boolean(parkName),
  };
}

export function themeAccent(theme: Pick<DayTheme, "accent">) {
  return `rgb(${theme.accent})`;
}
