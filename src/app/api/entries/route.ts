import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parkingEntries } from "@/db/schema";
import { like, and, eq, sql } from "drizzle-orm";
import { generateRefCode, getTodayDateString } from "@/lib/utils";
import { sendReceipt } from "@/lib/africastalking";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const building = params.get("building");
  const tenantType = params.get("tenantType");
  const paymentMethod = params.get("paymentMethod");
  const search = params.get("search");

  const today = getTodayDateString();

  const conditions = [like(parkingEntries.entryTime, `${today}%`)];

  if (building) {
    conditions.push(eq(parkingEntries.building, building));
  }
  if (tenantType) {
    conditions.push(eq(parkingEntries.tenantType, tenantType as "tenant" | "non-tenant" | "motorcycle"));
  }
  if (paymentMethod) {
    conditions.push(eq(parkingEntries.paymentMethod, paymentMethod as "cash" | "mpesa"));
  }
  if (search) {
    conditions.push(
      sql`(${parkingEntries.plateNumber} LIKE ${"%" + search.toUpperCase() + "%"} OR ${parkingEntries.driverName} LIKE ${"%" + search + "%"})`
    );
  }

  const entries = db
    .select()
    .from(parkingEntries)
    .where(and(...conditions))
    .orderBy(sql`${parkingEntries.entryTime} DESC`)
    .all();

  const totalVehicles = entries.length;
  const totalCollected = entries.reduce((sum, e) => sum + e.amountPaid, 0);

  return NextResponse.json({ entries, totalVehicles, totalCollected });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    plateNumber,
    driverName,
    phone,
    shopNumber,
    building,
    tenantType,
    paymentMethod,
    amountPaid,
    isPaid,
  } = body;

  if (!plateNumber || !tenantType || !paymentMethod || amountPaid === undefined) {
    return NextResponse.json(
      { error: "plateNumber, tenantType, paymentMethod, and amountPaid are required" },
      { status: 400 }
    );
  }

  const referenceCode = generateRefCode();
  const entryTime = new Date().toISOString();

  const result = db
    .insert(parkingEntries)
    .values({
      plateNumber: plateNumber.toUpperCase(),
      driverName,
      phone,
      shopNumber,
      building,
      tenantType,
      paymentMethod,
      amountPaid,
      isPaid: isPaid ?? true,
      entryTime,
      referenceCode,
    })
    .run();

  if (phone) {
    sendReceipt({
      phone,
      plate: plateNumber.toUpperCase(),
      amount: amountPaid,
      method: paymentMethod === "mpesa" ? "M-Pesa" : "Cash",
      building: building || "N/A",
      refCode: referenceCode,
    }).catch(console.error);
  }

  return NextResponse.json(
    {
      id: result.lastInsertRowid,
      referenceCode,
      entryTime,
    },
    { status: 201 }
  );
}
