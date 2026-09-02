import type { DayThemeId } from "@/lib/day-themes";

export type MainParkTheme = Extract<DayThemeId, "mk" | "epcot" | "hs" | "ak">;
export type TripStyle = "FIRST_VISIT" | "LITTLE_KIDS" | "THRILLS" | "RELAXED";
export type RestPreference = "AFTER_TRAVEL" | "MIDDLE" | "NONE" | "EVERY_OTHER";

export const PARK_GUIDES: Record<MainParkTheme, {
  name: string;
  eyebrow: string;
  description: string;
  reviewReason: string;
}> = {
  mk: {
    name: "Magic Kingdom",
    eyebrow: "The castle park",
    description: "Classic rides, characters, an afternoon parade on most days, and fireworks when scheduled.",
    reviewReason: "the castle park has the classic rides and characters most first-time families picture",
  },
  epcot: {
    name: "EPCOT",
    eyebrow: "Discover the world",
    description: "A few famous rides, indoor pavilions, World Showcase food, and evening light when scheduled.",
    reviewReason: "it mixes a few famous rides with indoor discoveries and World Showcase food",
  },
  hs: {
    name: "Hollywood Studios",
    eyebrow: "Step into the stories",
    description: "Toy Story, Star Wars, stage shows, and Fantasmic! when scheduled.",
    reviewReason: "it brings together Toy Story, Star Wars, stage shows, and movie-sized adventures",
  },
  ak: {
    name: "Animal Kingdom",
    eyebrow: "Follow the wild path",
    description: "Animals, walking trails, a couple of huge rides, and usually an earlier closing time.",
    reviewReason: "its animals and walking trails reward an earlier, gentler park day",
  },
};

export const TRIP_STYLE_LABELS: Record<TripStyle, string> = {
  FIRST_VISIT: "First visit",
  LITTLE_KIDS: "Little kids",
  THRILLS: "Thrills",
  RELAXED: "Relaxed",
};

export const REST_PREFERENCE_LABELS: Record<RestPreference, string> = {
  AFTER_TRAVEL: "Rest after travel day",
  MIDDLE: "Rest in the middle",
  NONE: "No extra rest days",
  EVERY_OTHER: "Rest every other park day",
};

export const GUIDED_PLAN_IDS: Record<TripStyle, Record<MainParkTheme, string>> = {
  FIRST_VISIT: { mk: "mk-first-visit", epcot: "epcot-world-tour", hs: "hs-story-day", ak: "ak-wildlife" },
  LITTLE_KIDS: { mk: "mk-little-kids", epcot: "epcot-world-tour", hs: "hs-little-kids", ak: "ak-wildlife" },
  THRILLS: { mk: "mk-thrills", epcot: "epcot-thrills", hs: "hs-thrills", ak: "ak-thrills" },
  RELAXED: { mk: "mk-little-kids", epcot: "epcot-world-tour", hs: "hs-little-kids", ak: "ak-wildlife" },
};

const PARK_ROTATION: MainParkTheme[] = ["mk", "epcot", "hs", "ak"];

export function buildGuidedWeek(dayCount: number, style: TripStyle, restPreference: RestPreference) {
  const restIndexes = new Set<number>();
  if (restPreference === "AFTER_TRAVEL" && dayCount > 1) restIndexes.add(1);
  if (restPreference === "MIDDLE" && dayCount > 2) restIndexes.add(Math.floor(dayCount / 2));
  if (restPreference === "EVERY_OTHER") {
    for (let index = 1; index < dayCount; index += 2) restIndexes.add(index);
  }

  let parkIndex = 0;
  return Array.from({ length: dayCount }, (_, index) => {
    if (restIndexes.has(index)) return { dayNumber: index + 1, park: null, planId: null, explanation: "a rest day gives your family room to recover and enjoy the resort" };
    const park = PARK_ROTATION[parkIndex % PARK_ROTATION.length];
    parkIndex += 1;
    return {
      dayNumber: index + 1,
      park,
      planId: GUIDED_PLAN_IDS[style][park],
      explanation: PARK_GUIDES[park].reviewReason,
    };
  });
}

export function guidedDraftNote(style: TripStyle, restPreference: RestPreference) {
  return `Draft week: ${TRIP_STYLE_LABELS[style]} pace with ${REST_PREFERENCE_LABELS[restPreference].toLowerCase()}. This is a starting point; change any park or stop.`;
}
