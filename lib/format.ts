const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const FA_GROUP = "٬";

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[٫٫]/g, ".")
    .replace(/[٬،]/g, "");
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

/** Parse a toman input that may include Persian digits and grouping. */
export function parseTomanInput(value: string): number | null {
  const normalized = toEnglishDigits(value).replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount);
}

/**
 * Storefront / admin UI shows تومان. Backend `price` is IRR (ریال).
 * 1 تومان = 10 ریال, so UI تومان × 10 = API IRR.
 * Example: ۱۲۸٬۰۰۰٬۰۰۰ تومان → 1_280_000_000 IRR.
 */
export const TOMAN_TO_IRR = 10;

export function tomanToIrr(toman: number): number {
  return Math.round(toman * TOMAN_TO_IRR);
}

export function irrToToman(irr: number): number {
  return Math.round(irr / TOMAN_TO_IRR);
}

export function formatTomanDisplay(toman: number): string {
  const grouped = Math.round(toman)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, FA_GROUP);
  return toPersianDigits(grouped);
}

export function formatTomanInput(raw: string): string {
  const parsed = parseTomanInput(raw);
  if (parsed === null) {
    const leftover = toEnglishDigits(raw).replace(/[^\d]/g, "");
    return leftover ? toPersianDigits(leftover) : "";
  }
  return formatTomanDisplay(parsed);
}

export function slugifyName(name: string): string {
  const latin = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (latin.length >= 3) return latin;

  const known: Record<string, string> = {
    "انگشتر سولیتر الماس": "solitaire-diamond-ring",
  };
  return known[name.trim()] ?? "";
}

