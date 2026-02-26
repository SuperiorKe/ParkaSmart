import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parkingEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  db.update(parkingEntries)
    .set({
      isPaid: true,
      ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
      ...(body.amountPaid !== undefined && { amountPaid: body.amountPaid }),
    })
    .where(eq(parkingEntries.id, entryId))
    .run();

  return NextResponse.json({ success: true });
}
