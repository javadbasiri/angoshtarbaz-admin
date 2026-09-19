import type { ProductFormValues } from "@/types/product";

/**
 * Official ANG-A1 sample. Carat is **۰.۸ / 0.8** everywhere — never 0.75 / ۰.۷۵.
 * Matches storefront PDP: انگشتر سولیتر الماس · ۱۲۸٬۰۰۰٬۰۰۰ تومان ·
 * برلیان طبیعی ۰.۸ قیراط · رنگ G · VS1 · preview «برلیان ۰.۸ قیراط · رکاب طلای ۱۸ عیار».
 */
export const SAMPLE_PRODUCT = {
  name: "انگشتر سولیتر الماس",
  slug: "solitaire-diamond-ring",
  description:
    "سولیتر کلاسیک با نگین برلیان گرد ۰.۸ قیراط، نشسته در بزل چهارچنگ دست‌ساز. رکاب طلای ۱۸ عیار با پرداخت براق — طراحی مینیمال برای درخشش حداکثری نگین.",
  priceToman: "۱۲۸٬۰۰۰٬۰۰۰",
  collectionId: "solitaire",
  stock: "6",
  gem: "برلیان طبیعی ۰.۸ قیراط · رنگ G · شفافیت VS1",
  previewMeta: "برلیان ۰.۸ قیراط · رکاب طلای ۱۸ عیار",
  weight: "۳٫۲ گرم",
  karat: "طلای ۱۸ عیار (۷۵۰)",
  cut: "برلیان گرد (Round Brilliant) · ۵۷ وجه",
  band: "طلای زرد ۱۸ عیار · بزل چهارچنگ دست‌ساز",
} as const;

export function sampleProductFormValues(
  collectionId = SAMPLE_PRODUCT.collectionId,
): ProductFormValues {
  return {
    name: SAMPLE_PRODUCT.name,
    slug: SAMPLE_PRODUCT.slug,
    slugManual: true,
    description: SAMPLE_PRODUCT.description,
    priceToman: SAMPLE_PRODUCT.priceToman,
    collectionId,
    stock: SAMPLE_PRODUCT.stock,
    status: "published",
    sizes: ["50", "52", "54", "56", "58"],
    specs: {
      weight: SAMPLE_PRODUCT.weight,
      karat: SAMPLE_PRODUCT.karat,
      gem: SAMPLE_PRODUCT.gem,
      cut: SAMPLE_PRODUCT.cut,
      band: SAMPLE_PRODUCT.band,
    },
    gallery: [],
  };
}

/** ۰.۸ / 0.8 only — does not match 0.75 / ۰.۷۵. */
const POINT_EIGHT = /۰\.۸|۰٫۸|0\.8|٠\.٨/;

export function buildPreviewMeta(
  specs: ProductFormValues["specs"],
  extras: { description?: string } = {},
): string {
  const gem = specs.gem.trim();
  const band = specs.band.trim();
  const karat = specs.karat.trim();
  const blob = `${gem} ${extras.description ?? ""}`;

  if (POINT_EIGHT.test(blob)) {
    const has18k = /۱۸|18/.test(`${karat} ${band} ${extras.description ?? ""}`);
    return has18k ? SAMPLE_PRODUCT.previewMeta : "برلیان ۰.۸ قیراط";
  }

  const gemBit = gem.split("·")[0]?.trim() || "";
  const bandBit = band
    ? band.startsWith("رکاب")
      ? band.split("·")[0]?.trim()
      : `رکاب ${karat.split("(")[0]?.trim() || band.split("·")[0]?.trim()}`
    : karat
      ? `رکاب ${karat.split("(")[0]?.trim()}`
      : "";

  if (gemBit && bandBit) return `${gemBit} · ${bandBit}`;
  if (gemBit) return gemBit;
  if (bandBit) return bandBit;
  return "";
}
