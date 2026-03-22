import { format, isValid, parseISO } from "date-fns";

/** Parse API datetime strings (space or T separated). */
export function parseSavariDate(raw: string): Date | null {
  if (!raw || raw === "—") return null;
  const s = String(raw).trim();
  const isoish = s.includes("T") ? s : s.replace(" ", "T");
  let d = parseISO(isoish);
  if (isValid(d)) return d;
  const t = Date.parse(s.replace(/\//g, "-"));
  if (Number.isFinite(t)) return new Date(t);
  return null;
}

/** e.g. 24-Mar-26 */
export function formatDdMmmYy(d: Date): string {
  return format(d, "dd-MMM-yy");
}

/** e.g. 12:30 PM */
export function formatTimeAmPm(d: Date): string {
  return format(d, "h:mm a");
}

/** One line for raw pickup field: date + time in AM/PM */
export function formatPickupDateTimeParts(raw: string): {
  dateStr: string;
  timeStr: string;
} {
  const d = parseSavariDate(raw);
  if (!d)
    return {
      dateStr: raw || "—",
      timeStr: "",
    };
  return {
    dateStr: formatDdMmmYy(d),
    timeStr: formatTimeAmPm(d),
  };
}

/** Step timestamps and similar — DD-MMM-YY h:mm a */
export function formatSavariDateTime(raw: string): string {
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-") return "—";
  const d = parseSavariDate(s);
  if (!d) return s;
  return `${formatDdMmmYy(d)} ${formatTimeAmPm(d)}`;
}

/**
 * Expires line: &lt;24h → minutes or hours; ≥24h → `Nd : HHr` (whole hours in remainder).
 */
export function formatExpiresLabel(hoursLeft: number | null): string {
  if (hoursLeft == null) return "—";
  if (hoursLeft < 1 / 60) return "—";
  if (hoursLeft < 1) return `${Math.max(1, Math.round(hoursLeft * 60))} min left`;
  if (hoursLeft < 24) {
    const h = hoursLeft;
    const rounded = h >= 10 ? h.toFixed(0) : h.toFixed(1);
    return `${rounded}h left`;
  }
  const d = Math.floor(hoursLeft / 24);
  const h = Math.floor(hoursLeft % 24);
  return `${d}d : ${h}Hr`;
}

/** Google Maps search URL for a postal address */
export function googleMapsSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
