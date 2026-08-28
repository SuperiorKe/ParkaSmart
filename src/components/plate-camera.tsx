"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PlateCameraProps {
  onPlateDetected: (chars: string[]) => void;
  variant?: "icon" | "card";
}

const PLATE_REGEX = /K[A-Z]{2}\s?\d{3}[A-Z]{1,2}/;

const SLOT_TYPES: ("letter" | "digit")[] = [
  "letter", "letter", "letter",
  "digit", "digit", "digit",
  "letter",
];

const LETTER_FROM_DIGIT: Record<string, string> = {
  "0": "O", "1": "I", "8": "B", "5": "S", "6": "G", "2": "Z",
};
const DIGIT_FROM_LETTER: Record<string, string> = {
  O: "0", I: "1", l: "1", B: "8", S: "5", G: "6", Z: "2",
};

const MIN_OCR_WIDTH = 1500;

function applyGrayscaleContrast(
  data: Uint8ClampedArray,
  contrast: number,
  brightness: number
) {
  for (let i = 0; i < data.length; i += 4) {
    let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255 + brightness;
    g = Math.max(0, Math.min(255, g));
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
  }
}

function buildVariants(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const upscale = Math.max(1, MIN_OCR_WIDTH / img.width);
      const w = Math.round(img.width * upscale);
      const h = Math.round(img.height * upscale);
      const variants: string[] = [];

      function drawFull() {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const cx = c.getContext("2d")!;
        cx.drawImage(img, 0, 0, w, h);
        return { c, cx };
      }

      function drawCrop(
        yFrac: number,
        hFrac: number,
        targetW?: number
      ) {
        const srcY = Math.floor(img.height * yFrac);
        const srcH = Math.floor(img.height * hFrac);
        const tw = targetW || w;
        const th = Math.round((srcH / img.width) * tw);
        const c = document.createElement("canvas");
        c.width = tw;
        c.height = th;
        const cx = c.getContext("2d")!;
        cx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, tw, th);
        return { c, cx };
      }

      // V0: full image upscaled + contrast
      {
        const { c, cx } = drawFull();
        const id = cx.getImageData(0, 0, w, h);
        applyGrayscaleContrast(id.data, 2.0, -10);
        cx.putImageData(id, 0, 0);
        variants.push(c.toDataURL("image/png"));
      }

      // V1: full image original (just upscaled)
      {
        const { c } = drawFull();
        variants.push(c.toDataURL("image/png"));
      }

      // V2: bottom 45% of image, high contrast (plates sit low on vehicles)
      {
        const { c, cx } = drawCrop(0.55, 0.45, Math.max(w, 2000));
        const id = cx.getImageData(0, 0, c.width, c.height);
        applyGrayscaleContrast(id.data, 2.0, -10);
        cx.putImageData(id, 0, 0);
        variants.push(c.toDataURL("image/png"));
      }

      // V3: bottom 45% adaptive binary threshold
      {
        const { c, cx } = drawCrop(0.55, 0.45, Math.max(w, 2000));
        const id = cx.getImageData(0, 0, c.width, c.height);
        const d = id.data;
        let sum = 0;
        const px = c.width * c.height;
        for (let i = 0; i < d.length; i += 4)
          sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const mean = sum / px;
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = g > mean ? 255 : 0;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        cx.putImageData(id, 0, 0);
        variants.push(c.toDataURL("image/png"));
      }

      URL.revokeObjectURL(img.src);
      resolve(variants);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function correctOcrPlate(raw: string): string {
  if (raw.length < 6) return raw;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (i < 3) {
      out += LETTER_FROM_DIGIT[ch] || ch;
    } else if (i < 6) {
      out += DIGIT_FROM_LETTER[ch] || ch;
    } else {
      out += LETTER_FROM_DIGIT[ch] || ch;
    }
  }
  return out;
}

function parseToChars(plateStr: string): string[] | null {
  const raw = plateStr.replace(/\s/g, "");
  const chars: string[] = Array(7).fill("");
  let j = 0;
  for (let i = 0; i < 7 && j < raw.length; j++) {
    const ch = raw[j];
    const type = SLOT_TYPES[i];
    if (
      (type === "letter" && /^[A-Z]$/.test(ch)) ||
      (type === "digit" && /^\d$/.test(ch))
    ) {
      chars[i] = ch;
      i++;
    }
  }
  if (chars.filter((c) => c).length < 6) return null;
  return chars;
}

function extractPlateChars(text: string): string[] | null {
  const upper = text.toUpperCase();

  // Strategy 1: direct regex on cleaned text
  const cleaned = upper.replace(/[^A-Z0-9\s]/g, "");
  const direct = cleaned.match(PLATE_REGEX);
  if (direct) return parseToChars(direct[0]);

  // Strategy 2: try every K-starting position in the joined text
  const joined = cleaned.replace(/\s+/g, "");
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] !== "K") continue;
    const seg = joined.slice(i, i + 8);
    if (seg.length < 6) continue;
    const corrected = correctOcrPlate(seg);
    const m = corrected.match(PLATE_REGEX);
    if (m) return parseToChars(m[0]);
  }

  // Strategy 3: search line-by-line (plates often OCR as their own line)
  const lines = upper.split(/[\n\r]+/);
  for (const line of lines) {
    const ln = line.replace(/[^A-Z0-9]/g, "");
    if (ln.length < 6 || ln.length > 10) continue;
    if (!ln.includes("K")) continue;
    const kPos = ln.indexOf("K");
    const seg = ln.slice(kPos, kPos + 8);
    const corrected = correctOcrPlate(seg);
    const m = corrected.match(PLATE_REGEX);
    if (m) return parseToChars(m[0]);
  }

  // Strategy 4: loose pattern -- find any K followed by alphanumeric cluster
  const loose = /K[A-Z0-9]{5,7}/g;
  let looseMatch;
  while ((looseMatch = loose.exec(joined)) !== null) {
    const corrected = correctOcrPlate(looseMatch[0]);
    const m = corrected.match(PLATE_REGEX);
    if (m) return parseToChars(m[0]);
  }

  return null;
}

export default function PlateCamera({
  onPlateDetected,
  variant = "icon",
}: PlateCameraProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("processing");
    setErrorMsg("");

    try {
      const variants = await buildVariants(file);
      const labels = ["full-contrast", "full-original", "bottom-contrast", "bottom-binary"];

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
      });

      let chars: string[] | null = null;
      const allTexts: string[] = [];

      for (let v = 0; v < variants.length; v++) {
        const { data: { text } } = await worker.recognize(variants[v]);
        console.log(`[PlateCamera] ${labels[v]} OCR:`, JSON.stringify(text));
        allTexts.push(text);
        chars = extractPlateChars(text);
        if (chars) {
          console.log(`[PlateCamera] Match in ${labels[v]}:`, chars.join(""));
          break;
        }
      }

      if (!chars) {
        const combined = allTexts.join("\n");
        chars = extractPlateChars(combined);
        if (chars) console.log("[PlateCamera] Match in combined:", chars.join(""));
      }

      await worker.terminate();

      if (chars) {
        setStatus("idle");
        onPlateDetected(chars);
      } else {
        setStatus("error");
        setErrorMsg("Could not read plate — get closer and try again");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (err) {
      console.error("[PlateCamera] Error:", err);
      setStatus("error");
      setErrorMsg("Camera error — please try again");
      setTimeout(() => setStatus("idle"), 3000);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleCapture}
      className="hidden"
    />
  );

  if (variant === "card") {
    return (
      <div>
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={status === "processing"}
          className={cn(
            "bg-card border border-border rounded-xl p-4 flex items-start gap-3 w-full text-left",
            "hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]",
            status === "processing" && "opacity-60 pointer-events-none"
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              status === "error"
                ? "bg-red-500 text-white"
                : "bg-violet-600 text-white"
            )}
          >
            {status === "processing" ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm sm:text-base">
              {status === "processing" ? "Reading plate..." : "Scan Plate"}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5 leading-tight",
                status === "error" ? "text-red-500" : "text-muted"
              )}
            >
              {status === "error"
                ? errorMsg
                : "Photo the plate up close"}
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      {fileInput}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={status === "processing"}
        title="Scan plate with camera"
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-lg border transition-colors",
          "text-muted hover:text-foreground hover:border-primary/40 hover:bg-primary/5",
          status === "processing" && "opacity-60 pointer-events-none",
          status === "error" && "border-red-300 text-red-500"
        )}
      >
        {status === "processing" ? (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        )}
      </button>
      {status !== "idle" && (
        <span
          className={cn(
            "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium",
            status === "error" ? "text-red-500" : "text-muted"
          )}
        >
          {status === "processing"
            ? "Reading plate..."
            : errorMsg || "Try again"}
        </span>
      )}
    </div>
  );
}
