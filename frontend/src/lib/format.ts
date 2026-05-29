import * as Localization from "expo-localization";

/** Returns true if the user's locale uses dd/mm/yyyy (India, Europe, most of Asia). */
function usesDMY(): boolean {
  try {
    const locale = (Localization.getLocales?.()[0]?.languageTag || "en-US").toLowerCase();
    // US uses mm/dd/yyyy; most others use dd/mm/yyyy
    return !locale.startsWith("en-us") && !locale.endsWith("-us");
  } catch {
    return true;
  }
}

export function formatDateLocale(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const mon = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return usesDMY() ? `${day}/${mon}/${year}` : `${mon}/${day}/${year}`;
}

export function toISODate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mon}-${day}`;
}
