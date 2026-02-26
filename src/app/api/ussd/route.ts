import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parkingEntries, tenants } from "@/db/schema";
import { like, eq } from "drizzle-orm";
import { generateRefCode, getTodayDateString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const sessionId = formData.get("sessionId") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const text = (formData.get("text") as string) || "";

  const parts = text.split("*").filter(Boolean);
  let response = "";

  if (text === "") {
    response = `CON Welcome to ParkaSmart
1. Log Vehicle Entry
2. Check Today's Total
3. Mark Vehicle as Paid`;
  } else if (parts[0] === "1" && parts.length === 1) {
    response = `CON Enter vehicle plate number:`;
  } else if (parts[0] === "1" && parts.length === 2) {
    const plate = parts[1].toUpperCase();
    const tenant = db
      .select()
      .from(tenants)
      .where(eq(tenants.plateNumber, plate))
      .get();

    if (tenant) {
      response = `CON ${tenant.name} - ${tenant.building}
Amount: Ksh ${tenant.monthlyRate}
1. Confirm (Cash)
2. Confirm (M-Pesa)
0. Cancel`;
    } else {
      response = `CON Non-tenant vehicle: ${plate}
Amount: Ksh 300
1. Confirm (Cash)
2. Confirm (M-Pesa)
0. Cancel`;
    }
  } else if (parts[0] === "1" && parts.length === 3) {
    const plate = parts[1].toUpperCase();
    const payChoice = parts[2];

    if (payChoice === "0") {
      response = `END Entry cancelled.`;
    } else {
      const tenant = db
        .select()
        .from(tenants)
        .where(eq(tenants.plateNumber, plate))
        .get();

      const refCode = generateRefCode();
      const method = payChoice === "2" ? "mpesa" : "cash";

      db.insert(parkingEntries)
        .values({
          plateNumber: plate,
          driverName: tenant?.name || "Walk-in",
          phone: tenant?.phone || phoneNumber,
          shopNumber: tenant?.shopNumber || null,
          building: tenant?.building || "N/A",
          tenantType: tenant ? "tenant" : "non-tenant",
          paymentMethod: method,
          amountPaid: tenant?.monthlyRate || 300,
          isPaid: true,
          entryTime: new Date().toISOString(),
          referenceCode: refCode,
        })
        .run();

      response = `END Vehicle ${plate} logged.
Ref: ${refCode}
Method: ${method === "mpesa" ? "M-Pesa" : "Cash"}`;
    }
  } else if (parts[0] === "2") {
    const today = getTodayDateString();
    const entries = db
      .select()
      .from(parkingEntries)
      .where(like(parkingEntries.entryTime, `${today}%`))
      .all();
    const total = entries.reduce((s, e) => s + e.amountPaid, 0);
    response = `END Today's Summary:
Vehicles: ${entries.length}
Revenue: Ksh ${total}`;
  } else if (parts[0] === "3" && parts.length === 1) {
    response = `CON Enter plate number to mark as paid:`;
  } else if (parts[0] === "3" && parts.length === 2) {
    const plate = parts[1].toUpperCase();
    const today = getTodayDateString();
    const entry = db
      .select()
      .from(parkingEntries)
      .where(like(parkingEntries.entryTime, `${today}%`))
      .all()
      .find((e) => e.plateNumber === plate && !e.isPaid);

    if (entry) {
      db.update(parkingEntries)
        .set({ isPaid: true })
        .where(eq(parkingEntries.id, entry.id))
        .run();
      response = `END ${plate} marked as PAID.
Ref: ${entry.referenceCode}`;
    } else {
      response = `END No unpaid entry found for ${plate} today.`;
    }
  } else {
    response = `END Invalid option. Please try again.`;
  }

  return new NextResponse(response, {
    headers: { "Content-Type": "text/plain" },
  });
}
