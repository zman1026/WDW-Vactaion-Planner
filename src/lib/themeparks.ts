/**
 * ThemeParks.wiki API client
 * Docs: https://api.themeparks.wiki/  and https://themeparks.wiki/api
 *
 * Free, no API key required (for now).
 * Rate limit: 300 requests / minute.
 * Recommended: cache static entities, poll live data every 5+ minutes.
 */

const BASE_URL = "https://api.themeparks.wiki/v1";

export type EntityType =
  | "DESTINATION"
  | "PARK"
  | "ATTRACTION"
  | "SHOW"
  | "RESTAURANT"
  | "HOTEL"
  | "LAND"
  | "EXPERIENCE";

export interface ThemeParksEntity {
  id: string;
  name: string;
  entityType: EntityType;
  parentId?: string;
  destination?: string;
  slug?: string;
  location?: any;
  // many more fields possible – we keep it flexible
  [key: string]: any;
}

export interface LiveData {
  id: string;
  name: string;
  entityType: string;
  status?: string;
  queue?: {
    STANDBY?: { waitTime?: number | null; status?: string };
    RETURN_TIME?: any;
    // etc.
  };
  showtimes?: any[];
  // ...
  [key: string]: any;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "User-Agent": "WDW-Planner/0.1 (family vacation planner; +https://github.com/yourname/wdw-planner)",
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // cache for 5 min on Next.js side where possible
  });

  if (!res.ok) {
    throw new Error(`ThemeParks API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

/** List all destinations */
export async function getDestinations() {
  return fetchJson<{ destinations: ThemeParksEntity[] }>("/destinations");
}

/** Get a single entity by ID */
export async function getEntity(entityId: string) {
  return fetchJson<ThemeParksEntity>(`/entity/${entityId}`);
}

/** Get all children of an entity (parks under destination, attractions under park, etc.) */
export async function getEntityChildren(entityId: string) {
  return fetchJson<{ children: ThemeParksEntity[] }>(`/entity/${entityId}/children`);
}

/** Get live data (wait times, status, showtimes) for an entity and its children */
export async function getEntityLive(entityId: string) {
  return fetchJson<{ liveData: LiveData[] }>(`/entity/${entityId}/live`);
}

/** Convenience: Walt Disney World destination ID (as of 2026) */
export const WDW_DESTINATION_ID = "e957da41-3552-4cf6-b636-5babc5cbc4e5"; // verify with /destinations if needed

/** Get full WDW hierarchy (destination → parks → attractions/restaurants/shows/hotels) */
export async function getWDWChildren() {
  return getEntityChildren(WDW_DESTINATION_ID);
}

/** Example helper: get Magic Kingdom live waits (you will look up the real park ID) */
export async function getParkLive(parkEntityId: string) {
  return getEntityLive(parkEntityId);
}
