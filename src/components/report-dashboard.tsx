"use client";

import { useState, useEffect } from "react";

interface ReportData {
  date: string;
  totalVehicles: number;
  tenantCount: number;
  tenantRevenue: number;
  nonTenantCount: number;
  nonTenantRevenue: number;
  motorcycleCount: number;
  motorcycleRevenue: number;
  cashTotal: number;
  mpesaTotal: number;
  grandTotal: number;
  paidCount: number;
  unpaidCount: number;
  buildingBreakdown: { building: string; count: number; total: number }[];
}

export default function ReportDashboard() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/today")
      .then((r) => r.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function sendToManager() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/reports/send", { method: "POST" });
      const data = await res.json();
      setSendResult(data.success ? "Report SMS sent to manager!" : data.error);
    } catch {
      setSendResult("Failed to send report.");
    } finally {
      setSending(false);
    }
  }

  function exportCSV() {
    fetch("/api/entries")
      .then((r) => r.json())
      .then(({ entries }) => {
        const headers = [
          "Plate", "Name", "Phone", "Shop", "Building",
          "Type", "Method", "Amount", "Paid", "Time", "Reference",
        ];
        const rows = entries.map(
          (e: Record<string, string | number | boolean>) =>
            [
              e.plateNumber, e.driverName, e.phone, e.shopNumber, e.building,
              e.tenantType, e.paymentMethod, e.amountPaid,
              e.isPaid ? "Yes" : "No", e.entryTime, e.referenceCode,
            ].join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parkasmart-report-${report?.date || "today"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading report...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-danger">Failed to load report.</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {sendResult && (
        <div
          className={`p-3 sm:p-4 rounded-lg text-sm font-medium ${
            sendResult.includes("sent")
              ? "bg-green-50 text-success border border-green-200"
              : "bg-red-50 text-danger border border-red-200"
          }`}
        >
          {sendResult}
        </div>
      )}

      {/* Grand Total */}
      <div className="bg-primary text-white rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-xs sm:text-sm opacity-80">Total Revenue — {report.date}</p>
        <p className="text-3xl sm:text-4xl font-bold mt-1">
          Ksh {report.grandTotal.toLocaleString()}
        </p>
        <p className="text-xs sm:text-sm opacity-80 mt-2">
          {report.totalVehicles} vehicles | {report.paidCount} paid, {report.unpaidCount} unpaid
        </p>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Tenants" count={report.tenantCount} revenue={report.tenantRevenue} color="blue" />
        <StatCard label="Non-Tenants" count={report.nonTenantCount} revenue={report.nonTenantRevenue} color="amber" />
        <StatCard label="Motorcycles" count={report.motorcycleCount} revenue={report.motorcycleRevenue} color="purple" />
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-xs sm:text-sm text-muted">Cash</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            Ksh {report.cashTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
          <p className="text-xs sm:text-sm text-muted">M-Pesa</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
            Ksh {report.mpesaTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Building Breakdown */}
      {report.buildingBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
          <h3 className="font-medium text-foreground mb-3">By Building</h3>
          <div className="space-y-3">
            {report.buildingBreakdown.map((b) => (
              <div key={b.building} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-foreground text-sm sm:text-base">{b.building}</p>
                  <p className="text-xs text-muted">{b.count} vehicles</p>
                </div>
                <p className="font-bold text-foreground">Ksh {b.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={sendToManager}
          disabled={sending}
          className="flex-1 py-3.5 sm:py-3 px-4 bg-primary hover:bg-primary-hover text-white
                     font-medium rounded-lg transition-colors disabled:opacity-50 active:scale-[0.98]"
        >
          {sending ? "Sending..." : "Send Report to Manager"}
        </button>
        <button
          onClick={exportCSV}
          className="flex-1 py-3.5 sm:py-3 px-4 bg-white border border-border text-foreground
                     font-medium rounded-lg hover:bg-card-hover transition-colors active:scale-[0.98]"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  revenue,
  color,
}: {
  label: string;
  count: number;
  revenue: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500",
    amber: "border-l-amber-500",
    purple: "border-l-purple-500",
  };

  return (
    <div
      className={`bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm border-l-4 ${
        colorMap[color] || ""
      }`}
    >
      <p className="text-xs sm:text-sm text-muted">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{count}</p>
      <p className="text-xs sm:text-sm text-muted mt-0.5 sm:mt-1">
        Ksh {revenue.toLocaleString()}
      </p>
    </div>
  );
}
