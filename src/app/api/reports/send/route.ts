import { NextResponse } from "next/server";
import { sendDailyReport } from "@/lib/africastalking";
import { getTodayDateString } from "@/lib/utils";
import { db } from "@/db";
import { parkingEntries } from "@/db/schema";
import { like } from "drizzle-orm";

export async function POST() {
  const managerPhone = process.env.MANAGER_PHONE;

  if (!managerPhone) {
    return NextResponse.json(
      { error: "MANAGER_PHONE not configured" },
      { status: 500 }
    );
  }

  const today = getTodayDateString();
  const entries = db
    .select()
    .from(parkingEntries)
    .where(like(parkingEntries.entryTime, `${today}%`))
    .all();

  const sum = (arr: typeof entries) => arr.reduce((s, e) => s + e.amountPaid, 0);

  const reportData = {
    date: today,
    totalVehicles: entries.length,
    tenantCount: entries.filter((e) => e.tenantType === "tenant").length,
    nonTenantCount: entries.filter((e) => e.tenantType === "non-tenant").length,
    motorcycleCount: entries.filter((e) => e.tenantType === "motorcycle").length,
    cashTotal: sum(entries.filter((e) => e.paymentMethod === "cash")),
    mpesaTotal: sum(entries.filter((e) => e.paymentMethod === "mpesa")),
    grandTotal: sum(entries),
    paidCount: entries.filter((e) => e.isPaid).length,
    unpaidCount: entries.filter((e) => !e.isPaid).length,
  };

  const result = await sendDailyReport(managerPhone, reportData);

  if (result.success) {
    return NextResponse.json({ success: true, message: "Report sent to manager" });
  }

  return NextResponse.json(
    { error: "Failed to send report SMS" },
    { status: 500 }
  );
}
