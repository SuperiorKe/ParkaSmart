"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParkingEntry } from "@/db/schema";
import { cn } from "@/lib/utils";

interface LogData {
  entries: ParkingEntry[];
  totalVehicles: number;
  totalCollected: number;
}

export default function ParkingLogTable() {
  const [data, setData] = useState<LogData>({ entries: [], totalVehicles: 0, totalCollected: 0 });
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState("");
  const [tenantType, setTenantType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [search, setSearch] = useState("");

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (building) params.set("building", building);
    if (tenantType) params.set("tenantType", tenantType);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/entries?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }, [building, tenantType, paymentMethod, search]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 10000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  async function markPaid(id: number) {
    await fetch(`/api/entries/${id}/pay`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchEntries();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm">
          <p className="text-xs sm:text-sm text-muted">Total Vehicles</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{data.totalVehicles}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm">
          <p className="text-xs sm:text-sm text-muted">Total Collected</p>
          <p className="text-2xl sm:text-3xl font-bold text-success">
            Ksh {data.totalCollected.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
        <input
          type="text"
          placeholder="Search plate or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-[200px] px-4 py-2.5 border border-border rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="flex gap-2 sm:gap-3">
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-border rounded-lg text-sm bg-white"
          >
            <option value="">All Buildings</option>
            <option value="OTC Mall">OTC Mall</option>
            <option value="Mathai S">Mathai S</option>
          </select>
          <select
            value={tenantType}
            onChange={(e) => setTenantType(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-border rounded-lg text-sm bg-white"
          >
            <option value="">All Types</option>
            <option value="tenant">Tenant</option>
            <option value="non-tenant">Non-Tenant</option>
            <option value="motorcycle">Motorcycle</option>
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-border rounded-lg text-sm bg-white"
          >
            <option value="">All Pay</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted">Loading...</div>
      ) : data.entries.length === 0 ? (
        <div className="p-8 text-center text-muted bg-card border border-border rounded-xl">
          No vehicles logged today. Start by logging an entry.
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {data.entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono font-bold text-foreground text-base">
                      {entry.plateNumber}
                    </p>
                    <p className="text-sm text-muted">{entry.driverName || "Unknown"}</p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium",
                      entry.isPaid ? "bg-green-100 text-success" : "bg-red-100 text-danger"
                    )}
                  >
                    {entry.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-muted space-y-0.5">
                    <p>{entry.building || "-"} — {entry.tenantType}</p>
                    <p>{entry.paymentMethod === "mpesa" ? "M-Pesa" : "Cash"} — {formatTime(entry.entryTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-lg">Ksh {entry.amountPaid}</p>
                    {!entry.isPaid && (
                      <button
                        onClick={() => markPaid(entry.id)}
                        className="text-xs px-3 py-1.5 bg-success text-white rounded-lg mt-1
                                   active:scale-[0.98]"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted">Plate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Building</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-muted">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Time</th>
                    <th className="text-center px-4 py-3 font-medium text-muted">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0 hover:bg-card-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium">{entry.plateNumber}</td>
                      <td className="px-4 py-3">{entry.driverName || "-"}</td>
                      <td className="px-4 py-3">{entry.building || "-"}</td>
                      <td className="px-4 py-3 capitalize">{entry.tenantType}</td>
                      <td className="px-4 py-3 text-right font-medium">Ksh {entry.amountPaid}</td>
                      <td className="px-4 py-3">{entry.paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</td>
                      <td className="px-4 py-3 text-muted">{formatTime(entry.entryTime)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                            entry.isPaid ? "bg-green-100 text-success" : "bg-red-100 text-danger"
                          )}
                        >
                          {entry.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!entry.isPaid && (
                          <button
                            onClick={() => markPaid(entry.id)}
                            className="text-xs px-3 py-1 bg-success text-white rounded-lg hover:bg-green-700"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
