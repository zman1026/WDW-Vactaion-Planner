import { NextResponse } from "next/server";

import { syncParkEntities } from "@/lib/park-entity-sync";

export async function POST() {
  try {
    return NextResponse.json(await syncParkEntities());
  } catch (error) {
    console.error("Failed to sync park entities", error);
    return NextResponse.json({ message: "Park data could not be refreshed." }, { status: 502 });
  }
}
