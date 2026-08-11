import { NextResponse } from "next/server";

import { syncParkEntities } from "@/lib/park-entity-sync";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const cronAuthorized = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
    const user = cronAuthorized ? null : await getCurrentUser();
    if (!cronAuthorized && !user) return NextResponse.json({ message: "Sign in or provide the cron bearer token to refresh the directory." }, { status: 401 });
    return NextResponse.json(await syncParkEntities());
  } catch (error) {
    console.error("Failed to sync park entities", error);
    return NextResponse.json({ message: "Park data could not be refreshed." }, { status: 502 });
  }
}
