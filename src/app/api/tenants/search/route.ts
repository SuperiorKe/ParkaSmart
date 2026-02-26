import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { like, and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const plate = request.nextUrl.searchParams.get("plate");

  if (!plate || plate.length < 2) {
    return NextResponse.json([]);
  }

  const results = db
    .select()
    .from(tenants)
    .where(
      and(
        like(tenants.plateNumber, `%${plate.toUpperCase()}%`),
        eq(tenants.isActive, true)
      )
    )
    .limit(5)
    .all();

  return NextResponse.json(results);
}
