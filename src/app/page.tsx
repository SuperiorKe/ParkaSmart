"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ReportData {
  totalVehicles: number;
  grandTotal: number;
  unpaidCount: number;
  paidCount: number;
  tenantCount: number;
  nonTenantCount: number;
  motorcycleCount: number;
  cashTotal: number;
  mpesaTotal: number;
}

interface Entry {
  id: number;
  plateNumber: string;
  building: string;
  amountPaid: number;
  isPaid: boolean;
  tenantType: string;
  entryTime: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const quickActions = [
  {
    href: "/entry",
    label: "Log Entry",
    description: "Record a new vehicle",
    icon: "+",
    accent: "bg-primary text-white",
  },
  {
    href: "/log",
    label: "View Log",
    description: "Today's parking entries",
    icon: "≡",
    accent: "bg-slate-700 text-white",
  },
  {
    href: "/report",
    label: "Reports",
    description: "Revenue & summaries",
    icon: "◈",
    accent: "bg-emerald-600 text-white",
  },
  {
    href: "/admin",
    label: "Tenants",
    description: "Manage registrations",
    icon: "⚙",
    accent: "bg-amber-500 text-white",
  },
];

export default function Home() {
  const [stats, setStats] = useState<ReportData | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, entriesRes] = await Promise.all([
          fetch("/api/reports/today"),
          fetch("/api/entries"),
        ]);
        const statsData = await statsRes.json();
        const entriesData = await entriesRes.json();
        setStats(statsData);
        setEntries((entriesData.entries || []).slice(0, 5));
      } catch {
        // silent fail — stats show as 0
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {getGreeting()}
        </h1>
        <p className="text-muted text-sm">{formatDate()}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className={cn(
            "text-2xl sm:text-3xl font-bold",
            loading ? "text-muted" : "text-primary"
          )}>
            {loading ? "–" : stats?.totalVehicles ?? 0}
          </p>
          <p className="text-xs sm:text-sm text-muted mt-1">Vehicles</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className={cn(
            "text-2xl sm:text-3xl font-bold",
            loading ? "text-muted" : "text-emerald-600"
          )}>
            {loading ? "–" : `${(stats?.grandTotal ?? 0).toLocaleString()}`}
          </p>
          <p className="text-xs sm:text-sm text-muted mt-1">Ksh Today</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className={cn(
            "text-2xl sm:text-3xl font-bold",
            loading ? "text-muted" : (stats?.unpaidCount ?? 0) > 0 ? "text-amber-500" : "text-emerald-600"
          )}>
            {loading ? "–" : stats?.unpaidCount ?? 0}
          </p>
          <p className="text-xs sm:text-sm text-muted mt-1">Unpaid</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3
                         hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0",
                action.accent
              )}>
                {action.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {action.label}
                </p>
                <p className="text-xs text-muted mt-0.5 leading-tight">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Recent Entries
          </h2>
          {entries.length > 0 && (
            <Link href="/log" className="text-xs text-primary font-medium hover:underline">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted text-sm">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted text-sm">No entries today</p>
            <Link
              href="/entry"
              className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
            >
              Log the first vehicle
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-sm text-foreground">
                    {entry.plateNumber}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {entry.building || "–"} · {new Date(entry.entryTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    Ksh {entry.amountPaid.toLocaleString()}
                  </span>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                    entry.isPaid
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {entry.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
