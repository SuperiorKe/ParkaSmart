import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tenants = sqliteTable("tenants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plateNumber: text("plate_number").unique().notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  shopNumber: text("shop_number"),
  floorCode: text("floor_code"),
  building: text("building").notNull(),
  monthlyRate: integer("monthly_rate").default(300),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const parkingEntries = sqliteTable("parking_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plateNumber: text("plate_number").notNull(),
  driverName: text("driver_name"),
  phone: text("phone"),
  shopNumber: text("shop_number"),
  building: text("building"),
  tenantType: text("tenant_type", {
    enum: ["tenant", "non-tenant", "motorcycle"],
  }).notNull(),
  paymentMethod: text("payment_method", {
    enum: ["cash", "mpesa"],
  }).notNull(),
  amountPaid: integer("amount_paid").notNull(),
  isPaid: integer("is_paid", { mode: "boolean" }).default(false),
  entryTime: text("entry_time").notNull(),
  referenceCode: text("reference_code").notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type ParkingEntry = typeof parkingEntries.$inferSelect;
export type NewParkingEntry = typeof parkingEntries.$inferInsert;
