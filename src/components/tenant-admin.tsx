"use client";

import { useState, useEffect } from "react";
import type { Tenant } from "@/db/schema";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  plateNumber: "",
  name: "",
  phone: "",
  shopNumber: "",
  floorCode: "",
  building: "OTC Mall",
  monthlyRate: 300,
};

export default function TenantAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function fetchTenants() {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      setTenants(data);
    } catch {
      console.error("Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  function startEdit(tenant: Tenant) {
    setEditing(tenant);
    setForm({
      plateNumber: tenant.plateNumber,
      name: tenant.name,
      phone: tenant.phone || "",
      shopNumber: tenant.shopNumber || "",
      floorCode: tenant.floorCode || "",
      building: tenant.building,
      monthlyRate: tenant.monthlyRate || 300,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editing) {
        const res = await fetch("/api/tenants", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        if (res.ok) setMessage("Tenant updated.");
      } else {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Failed to add tenant.");
          setSubmitting(false);
          return;
        }
        setMessage("Tenant added.");
      }

      setShowForm(false);
      setEditing(null);
      fetchTenants();
    } catch {
      setMessage("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(tenant: Tenant) {
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenant.id, isActive: !tenant.isActive }),
    });
    fetchTenants();
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200">
          {message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">{tenants.length} tenants registered</p>
        <button
          onClick={startNew}
          className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg
                     hover:bg-primary-hover transition-colors active:scale-[0.98]"
        >
          + Add Tenant
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm">
          <h3 className="font-medium text-foreground mb-4">
            {editing ? "Edit Tenant" : "New Tenant"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Plate Number *"
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                required
                disabled={!!editing}
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm
                           disabled:bg-gray-100 disabled:text-muted"
              />
              <input
                type="text"
                placeholder="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Shop Number"
                value={form.shopNumber}
                onChange={(e) => setForm({ ...form, shopNumber: e.target.value })}
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Floor Code"
                value={form.floorCode}
                onChange={(e) => setForm({ ...form, floorCode: e.target.value })}
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm"
              />
              <select
                value={form.building}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
                className="px-3 py-3 sm:py-2 border border-border rounded-lg text-sm bg-white"
              >
                <option value="OTC Mall">OTC Mall</option>
                <option value="Mathai S">Mathai S</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                placeholder="Monthly Rate"
                value={form.monthlyRate}
                onChange={(e) => setForm({ ...form, monthlyRate: Number(e.target.value) })}
                className="sm:w-40 px-3 py-3 sm:py-2 border border-border rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-white text-sm font-medium
                             rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editing ? "Update" : "Add Tenant"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-border text-sm rounded-lg
                             hover:bg-card-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Mobile: Card layout / Desktop: Table */}
      {loading ? (
        <div className="p-8 text-center text-muted">Loading...</div>
      ) : tenants.length === 0 ? (
        <div className="p-8 text-center text-muted bg-card border border-border rounded-xl">
          No tenants registered yet.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tenants.map((t) => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono font-medium text-foreground">{t.plateNumber}</p>
                    <p className="text-sm text-foreground">{t.name}</p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      t.isActive ? "bg-green-100 text-success" : "bg-gray-100 text-muted"
                    )}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-muted space-y-0.5 mb-3">
                  <p>{t.building} — {t.floorCode} {t.shopNumber}</p>
                  <p>{t.phone || "No phone"} — Ksh {t.monthlyRate}/mo</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="flex-1 text-xs py-2 border border-border rounded-lg hover:bg-card-hover"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(t)}
                    className={cn(
                      "flex-1 text-xs py-2 rounded-lg text-white",
                      t.isActive ? "bg-red-500" : "bg-green-500"
                    )}
                  >
                    {t.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted">Plate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Shop</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Building</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Rate</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                    <td className="px-4 py-3 font-mono font-medium">{t.plateNumber}</td>
                    <td className="px-4 py-3">{t.name}</td>
                    <td className="px-4 py-3 text-muted">{t.phone || "-"}</td>
                    <td className="px-4 py-3">{t.floorCode} {t.shopNumber}</td>
                    <td className="px-4 py-3">{t.building}</td>
                    <td className="px-4 py-3 text-right">Ksh {t.monthlyRate}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          t.isActive ? "bg-green-100 text-success" : "bg-gray-100 text-muted"
                        )}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => startEdit(t)} className="text-xs px-2 py-1 border border-border rounded hover:bg-card-hover">Edit</button>
                        <button onClick={() => toggleActive(t)} className={cn("text-xs px-2 py-1 rounded text-white", t.isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")}>{t.isActive ? "Deactivate" : "Activate"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
