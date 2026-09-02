import type { ThemeParksEntity } from "@/lib/themeparks";

// ThemeParks.wiki does not currently expose lodging entities in the WDW
// hierarchy. This fallback follows Disney's published Resorts Collection.
const RESORT_NAMES = [
  "Bay Lake Tower at Disney's Contemporary Resort",
  "Boulder Ridge Villas at Disney's Wilderness Lodge",
  "Copper Creek Villas & Cabins at Disney's Wilderness Lodge",
  "Disney's All-Star Movies Resort",
  "Disney's All-Star Music Resort",
  "Disney's All-Star Sports Resort",
  "Disney's Animal Kingdom Lodge",
  "Disney's Animal Kingdom Villas - Jambo House",
  "Disney's Animal Kingdom Villas - Kidani Village",
  "Disney's Art of Animation Resort",
  "Disney's Beach Club Resort",
  "Disney's Beach Club Villas",
  "Disney's BoardWalk Inn",
  "Disney's BoardWalk Villas",
  "Disney's Caribbean Beach Resort",
  "Disney's Contemporary Resort",
  "Disney's Coronado Springs Resort",
  "Disney's Grand Floridian Resort & Spa",
  "Disney's Old Key West Resort",
  "Disney's Polynesian Village Resort",
  "Disney's Polynesian Villas & Bungalows",
  "Disney's Pop Century Resort",
  "Disney's Port Orleans Resort - French Quarter",
  "Disney's Port Orleans Resort - Riverside",
  "Disney's Riviera Resort",
  "Disney's Saratoga Springs Resort & Spa",
  "Disney's Wilderness Lodge",
  "Disney's Yacht Club Resort",
  "The Cabins at Disney's Fort Wilderness Resort",
  "The Cabins at Disney's Fort Wilderness Resort - A Disney Vacation Club Resort",
  "The Campsites at Disney's Fort Wilderness Resort",
  "The Villas at Disney's Grand Floridian Resort & Spa",
  "Walt Disney World Dolphin",
  "Walt Disney World Swan",
  "Walt Disney World Swan Reserve",
] as const;

function slugify(name: string) {
  return name.toLowerCase().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const WDW_HOTELS: ThemeParksEntity[] = RESORT_NAMES.map((name) => ({
  id: `wdw-hotel:${slugify(name)}`,
  name,
  entityType: "HOTEL",
  parentId: "e957da41-3552-4cf6-b636-5babc5cbc4e5",
  destination: "e957da41-3552-4cf6-b636-5babc5cbc4e5",
  slug: slugify(name),
  source: "disney-resorts-collection",
}));
