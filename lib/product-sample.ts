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

export function buildPreviewMeta(specs: ProductFormValues["specs"]): string {
  const gem = specs.gem.trim();
  const band = specs.band.trim();
  const karat = specs.karat.trim();

  const gemBit =
    gem.includes("۰.۸") || gem.includes("0.8")
      ? "برلیان ۰.۸ قیراط"
      : gem.split("·")[0]?.trim() || "";

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
  if (gem) return gem;
  return "";
}
