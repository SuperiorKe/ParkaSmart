import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allTenants = db.select().from(tenants).all();
  return NextResponse.json(allTenants);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { plateNumber, name, phone, shopNumber, floorCode, building, monthlyRate } = body;

  if (!plateNumber || !name || !building) {
    return NextResponse.json(
      { error: "plateNumber, name, and building are required" },
      { status: 400 }
    );
  }

  try {
    const result = db.insert(tenants).values({
      plateNumber,
      name,
      phone,
      shopNumber,
      floorCode,
      building,
      monthlyRate: monthlyRate || 300,
    }).run();

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Plate number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.update(tenants).set(updates).where(eq(tenants.id, id)).run();
  return NextResponse.json({ success: true });
}
