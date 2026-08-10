import type { PartyProfile } from "@/lib/trip-management-validation";

export function normalizePartyProfile(value: unknown): PartyProfile {
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    partySize: typeof profile.partySize === "number" ? profile.partySize : 1,
    ages: typeof profile.ages === "string" ? profile.ages : "",
    dietaryNotes: typeof profile.dietaryNotes === "string" ? profile.dietaryNotes : "",
    accessibilityNotes: typeof profile.accessibilityNotes === "string" ? profile.accessibilityNotes : "",
    mustDos: typeof profile.mustDos === "string" ? profile.mustDos : "",
    avoidList: typeof profile.avoidList === "string" ? profile.avoidList : "",
  };
}

export function partyProfileSummary(profile: PartyProfile) {
  return [
    `${profile.partySize} ${profile.partySize === 1 ? "guest" : "guests"}`,
    profile.ages && `Ages: ${profile.ages}`,
    profile.dietaryNotes && `Dietary: ${profile.dietaryNotes}`,
    profile.accessibilityNotes && `Accessibility: ${profile.accessibilityNotes}`,
    profile.mustDos && `Must-dos: ${profile.mustDos}`,
    profile.avoidList && `Avoid: ${profile.avoidList}`,
  ].filter(Boolean).join("\n");
}
