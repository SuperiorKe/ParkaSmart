export function generateRefCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PS-${timestamp}-${random}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return `Ksh ${amount.toLocaleString()}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPlateNumber(input: string): string {
  const cleaned = input.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return cleaned.slice(0, 3) + " " + cleaned.slice(3, 7);
}

const PLATE_REGEX = /^K[A-Z]{2}\s?\d{3}[A-Z]{1,2}$/;
const PARTIAL_PLATE_REGEX = /^K[A-Z]{0,2}\s?\d{0,3}[A-Z]{0,2}$/;

export function isValidPlateNumber(plate: string): boolean {
  return PLATE_REGEX.test(plate.trim());
}

export function isPartiallyValidPlate(plate: string): boolean {
  return PARTIAL_PLATE_REGEX.test(plate.trim()) && plate.trim().length >= 1;
}
