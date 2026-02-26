"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Tenant } from "@/db/schema";
import { isValidPlateNumber, isPartiallyValidPlate, cn } from "@/lib/utils";

const TENANT_TYPES = [
  { value: "tenant", label: "Tenant", defaultAmount: 300 },
  { value: "non-tenant", label: "Non-Tenant", defaultAmount: 300 },
  { value: "motorcycle", label: "Motorcycle", defaultAmount: 100 },
] as const;

const SLOT_TYPES: ("letter" | "digit")[] = [
  "letter", "letter", "letter",
  "digit", "digit", "digit",
  "letter",
];
const PLATE_HINTS = ["K", "A", "A", "0", "0", "0", "A"];

export default function VehicleEntryForm() {
  const [plateChars, setPlateChars] = useState<string[]>(Array(7).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [driverName, setDriverName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopNumber, setShopNumber] = useState("");
  const [building, setBuilding] = useState("");
  const [tenantType, setTenantType] = useState("tenant");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(300);
  const [isPaid, setIsPaid] = useState(true);

  const [suggestions, setSuggestions] = useState<Tenant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [plateTouched, setPlateTouched] = useState(false);

  const plateNumber = useMemo(() => {
    const prefix = plateChars.slice(0, 3).join("");
    const digits = plateChars.slice(3, 6).join("");
    const suffix = plateChars[6] || "";
    const combined = prefix + digits + suffix;
    if (!combined) return "";
    if (!digits && !suffix) return prefix;
    return `${prefix} ${digits}${suffix}`;
  }, [plateChars]);

  const plateValid = isValidPlateNumber(plateNumber);
  const platePartial = isPartiallyValidPlate(plateNumber);

  const searchTenants = useCallback(async (query: string) => {
    if (query.length < 3 || !isPartiallyValidPlate(query)) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/tenants/search?plate=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchTenants(plateNumber), 300);
    return () => clearTimeout(timer);
  }, [plateNumber, searchTenants]);

  function handleCharChange(index: number, value: string) {
    const char = value.slice(-1).toUpperCase();
    if (!char) {
      const next = [...plateChars];
      next[index] = "";
      setPlateChars(next);
      return;
    }
    const type = SLOT_TYPES[index];
    if (type === "letter" && !/^[A-Z]$/.test(char)) return;
    if (type === "digit" && !/^\d$/.test(char)) return;

    const next = [...plateChars];
    next[index] = char;
    setPlateChars(next);
    if (!plateTouched) setPlateTouched(true);
    if (index < 6) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (plateChars[index]) {
        const next = [...plateChars];
        next[index] = "";
        setPlateChars(next);
      } else if (index > 0) {
        const next = [...plateChars];
        next[index - 1] = "";
        setPlateChars(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 6) inputRefs.current[index + 1]?.focus();
  }

  function handlePlatePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const next = Array(7).fill("");
    let j = 0;
    for (let i = 0; i < 7 && j < raw.length; j++) {
      const ch = raw[j];
      const type = SLOT_TYPES[i];
      if ((type === "letter" && /^[A-Z]$/.test(ch)) || (type === "digit" && /^\d$/.test(ch))) {
        next[i] = ch;
        i++;
      }
    }
    setPlateChars(next);
    setPlateTouched(true);
    const firstEmpty = next.findIndex((c: string) => !c);
    inputRefs.current[firstEmpty >= 0 ? firstEmpty : 6]?.focus();
  }

  function handlePlateAreaBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setTimeout(() => setShowSuggestions(false), 200);
    setPlateTouched(true);
  }

  function selectTenant(tenant: Tenant) {
    const raw = tenant.plateNumber.replace(/\s/g, "").toUpperCase();
    const next = Array(7).fill("");
    for (let i = 0; i < Math.min(raw.length, 7); i++) next[i] = raw[i];
    setPlateChars(next);
    setDriverName(tenant.name);
    setPhone(tenant.phone || "");
    setShopNumber(tenant.shopNumber || "");
    setBuilding(tenant.building);
    setTenantType("tenant");
    setAmountPaid(tenant.monthlyRate || 300);
    setShowSuggestions(false);
    setPlateTouched(true);
  }

  function handleTenantTypeChange(type: string) {
    setTenantType(type);
    const config = TENANT_TYPES.find((t) => t.value === type);
    if (config) setAmountPaid(config.defaultAmount);
  }

  function resetForm() {
    setPlateChars(Array(7).fill(""));
    setDriverName("");
    setPhone("");
    setShopNumber("");
    setBuilding("");
    setTenantType("tenant");
    setPaymentMethod("cash");
    setAmountPaid(300);
    setIsPaid(true);
    setSuggestions([]);
    setPlateTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPlateTouched(true);
    if (!plateValid) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber,
          driverName,
          phone,
          shopNumber,
          building,
          tenantType,
          paymentMethod,
          amountPaid,
          isPaid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to log vehicle" });
        return;
      }

      setMessage({
        type: "success",
        text: `Vehicle logged! Ref: ${data.referenceCode}${phone ? " — SMS receipt sent" : ""}`,
      });
      resetForm();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {message && (
        <div
          className={cn(
            "p-3 sm:p-4 rounded-lg text-sm font-medium",
            message.type === "success"
              ? "bg-green-50 text-success border border-green-200"
              : "bg-red-50 text-danger border border-red-200"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Plate Number — Code Input */}
      <div className="relative" onBlur={handlePlateAreaBlur}>
        <label className="block text-sm font-medium text-foreground mb-2">
          Plate Number
        </label>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={2}
              value={plateChars[i]}
              placeholder={PLATE_HINTS[i]}
              onChange={(e) => handleCharChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePlatePaste}
              onFocus={(e) => {
                e.target.select();
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              autoComplete="off"
              className={cn(
                "w-11 h-13 sm:w-13 sm:h-15 md:w-14 md:h-16 text-center text-xl sm:text-2xl font-mono font-bold",
                "border-2 rounded-xl bg-white",
                "placeholder:text-gray-300 placeholder:font-normal",
                "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors",
                plateTouched && plateValid
                  ? "border-green-500 bg-green-50"
                  : plateChars[i]
                    ? "border-gray-400"
                    : "border-gray-200"
              )}
            />
          ))}

          <span className="text-gray-300 font-mono text-xl select-none px-0.5">–</span>

          {[3, 4, 5].map((i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={plateChars[i]}
              placeholder={PLATE_HINTS[i]}
              onChange={(e) => handleCharChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePlatePaste}
              onFocus={(e) => {
                e.target.select();
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              autoComplete="off"
              className={cn(
                "w-11 h-13 sm:w-13 sm:h-15 md:w-14 md:h-16 text-center text-xl sm:text-2xl font-mono font-bold",
                "border-2 rounded-xl bg-white",
                "placeholder:text-gray-300 placeholder:font-normal",
                "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors",
                plateTouched && plateValid
                  ? "border-green-500 bg-green-50"
                  : plateChars[i]
                    ? "border-gray-400"
                    : "border-gray-200"
              )}
            />
          ))}

          <input
            ref={(el) => { inputRefs.current[6] = el; }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={2}
            value={plateChars[6]}
            placeholder={PLATE_HINTS[6]}
            onChange={(e) => handleCharChange(6, e.target.value)}
            onKeyDown={(e) => handleKeyDown(6, e)}
            onPaste={handlePlatePaste}
            onFocus={(e) => {
              e.target.select();
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            autoComplete="off"
            className={cn(
              "w-11 h-13 sm:w-13 sm:h-15 md:w-14 md:h-16 text-center text-xl sm:text-2xl font-mono font-bold",
              "border-2 rounded-xl bg-white",
              "placeholder:text-gray-300 placeholder:font-normal",
              "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors",
              plateTouched && plateValid
                ? "border-green-500 bg-green-50"
                : plateChars[6]
                  ? "border-gray-400"
                  : "border-gray-200"
            )}
          />
        </div>

        {plateTouched && plateNumber.length > 0 && (
          <p
            className={cn(
              "text-xs mt-2 text-center",
              plateValid ? "text-green-600" : !platePartial ? "text-red-500" : "text-muted"
            )}
          >
            {plateValid
              ? "Valid plate number"
              : !platePartial
                ? "Format: KXX 000X (e.g. KDA 456B)"
                : "Keep typing..."}
          </p>
        )}

        {showSuggestions && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={() => selectTenant(t)}
                className="w-full px-4 py-4 sm:py-3 text-left hover:bg-card-hover
                           flex flex-col sm:flex-row sm:justify-between sm:items-center
                           border-b border-border last:border-0 gap-1"
              >
                <div>
                  <span className="font-mono font-medium">{t.plateNumber}</span>
                  <span className="text-muted ml-2">{t.name}</span>
                </div>
                <span className="text-xs text-muted">
                  {t.building} — {t.floorCode} {t.shopNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tenant Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Tenant Type
        </label>
        <div className="flex gap-2">
          {TENANT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTenantTypeChange(type.value)}
              className={cn(
                "flex-1 py-3 px-3 sm:px-4 rounded-lg text-sm font-medium border transition-colors",
                tenantType === type.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:bg-card-hover"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Driver Name
          </label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="Name"
            className="w-full px-4 py-3 border border-border rounded-lg text-foreground
                       placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary
                       focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254..."
            inputMode="tel"
            className="w-full px-4 py-3 border border-border rounded-lg text-foreground
                       placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary
                       focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Shop / Floor Code
          </label>
          <input
            type="text"
            value={shopNumber}
            onChange={(e) => setShopNumber(e.target.value)}
            placeholder="e.g. F2B 051"
            className="w-full px-4 py-3 border border-border rounded-lg text-foreground
                       placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary
                       focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Building
          </label>
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       bg-white"
          >
            <option value="">Select Building</option>
            <option value="OTC Mall">OTC Mall</option>
            <option value="Mathai S">Mathai S</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Payment Method
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium border transition-colors",
              paymentMethod === "cash"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-foreground border-border hover:bg-card-hover"
            )}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("mpesa")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium border transition-colors",
              paymentMethod === "mpesa"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-foreground border-border hover:bg-card-hover"
            )}
          >
            M-Pesa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Amount (Ksh)
          </label>
          <input
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(Number(e.target.value))}
            min={0}
            required
            inputMode="numeric"
            className="w-full px-4 py-3 border border-border rounded-lg text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       text-lg font-medium"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer py-3 sm:py-0">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">Paid</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || (plateTouched && !plateValid)}
        className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-medium
                   rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   text-base active:scale-[0.98]"
      >
        {submitting ? "Logging Vehicle..." : "Log Vehicle Entry"}
      </button>
    </form>
  );
}
