import { NextResponse } from "next/server";
import { db } from "@/db";
import { parkingEntries } from "@/db/schema";
import { like, eq, and, sql } from "drizzle-orm";
import { getTodayDateString } from "@/lib/utils";

export async function GET() {
  const today = getTodayDateString();

  const entries = db
    .select()
    .from(parkingEntries)
    .where(like(parkingEntries.entryTime, `${today}%`))
    .all();

  const totalVehicles = entries.length;
  const tenantEntries = entries.filter((e) => e.tenantType === "tenant");
  const nonTenantEntries = entries.filter((e) => e.tenantType === "non-tenant");
  const motorcycleEntries = entries.filter((e) => e.tenantType === "motorcycle");

  const cashEntries = entries.filter((e) => e.paymentMethod === "cash");
  const mpesaEntries = entries.filter((e) => e.paymentMethod === "mpesa");

  const sum = (arr: typeof entries) => arr.reduce((s, e) => s + e.amountPaid, 0);

  const buildings = [...new Set(entries.map((e) => e.building).filter(Boolean))];
  const buildingBreakdown = buildings.map((b) => {
    const bEntries = entries.filter((e) => e.building === b);
    return {
      building: b,
      count: bEntries.length,
      total: sum(bEntries),
    };
  });

  return NextResponse.json({
    date: today,
    totalVehicles,
    tenantCount: tenantEntries.length,
    tenantRevenue: sum(tenantEntries),
    nonTenantCount: nonTenantEntries.length,
    nonTenantRevenue: sum(nonTenantEntries),
    motorcycleCount: motorcycleEntries.length,
    motorcycleRevenue: sum(motorcycleEntries),
    cashTotal: sum(cashEntries),
    mpesaTotal: sum(mpesaEntries),
    grandTotal: sum(entries),
    paidCount: entries.filter((e) => e.isPaid).length,
    unpaidCount: entries.filter((e) => !e.isPaid).length,
    buildingBreakdown,
  });
}
