import { NextResponse } from "next/server";

import { getEntityLive } from "@/lib/themeparks";

export async function GET(_request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  try {
    const { entityId } = await params;
    const result = await getEntityLive(entityId);
    return NextResponse.json({ liveData: result.liveData.map((entry) => ({ id: entry.id, name: entry.name, status: entry.status, operatingHours: entry.operatingHours ?? [], showtimes: entry.showtimes ?? [] })) });
  } catch (error) {
    console.error("Live timing lookup failed", error);
    return NextResponse.json({ message: "Live timing is temporarily unavailable." }, { status: 502 });
  }
}
