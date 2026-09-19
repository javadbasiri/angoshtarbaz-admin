export type ProductStatus = "draft" | "published";

export type ProductSpecs = {
  weight: string;
  karat: string;
  gem: string;
  cut: string;
  band: string;
};

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  price: string;
  collection: string;
  status: ProductStatus;
  sizes: string[];
  specs: ProductSpecs;
  gallery: string[];
};

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  collection: "",
  status: "draft",
  sizes: [],
  specs: {
    weight: "",
    karat: "",
    gem: "",
    cut: "",
    band: "",
  },
  gallery: [],
};

/** Placeholder ring sizes (EU / circumference). Refine against backend catalog. */
export const RING_SIZE_OPTIONS = [
  "50",
  "52",
  "54",
  "56",
  "58",
  "60",
  "62",
  "64",
] as const;

/** Temporary collection options until ANG-A1 loads them from the API. */
export const COLLECTION_OPTIONS = [
  { value: "", label: "بدون کالکشن" },
  { value: "classic", label: "کلاسیک" },
  { value: "modern", label: "مدرن" },
  { value: "bridal", label: "عروس" },
] as const;
