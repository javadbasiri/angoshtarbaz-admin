import type { CollectionOption } from "@/types/collection";

export type ProductStatus = "draft" | "published";

export type ProductSpecs = {
  weight: string;
  karat: string;
  gem: string;
  cut: string;
  band: string;
};

export type GalleryImage = {
  id: string;
  url: string;
  name: string;
  file?: File;
  remoteId?: string;
  kind?: "image" | "video";
};

export type ProductFormValues = {
  name: string;
  slug: string;
  slugManual: boolean;
  description: string;
  /** Toman string as shown in the UI (Persian digits + grouping). */
  priceToman: string;
  collectionId: string;
  stock: string;
  status: ProductStatus;
  sizes: string[];
  specs: ProductSpecs;
  gallery: GalleryImage[];
};

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  slug: "",
  slugManual: false,
  description: "",
  priceToman: "",
  collectionId: "",
  stock: "0",
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

/** EU / circumference sizes from the ANG-A1 mockup (50–58). */
export const RING_SIZE_OPTIONS = ["50", "52", "54", "56", "58"] as const;

export type CreateProductRequest = {
  name: string;
  slug?: string;
  description: string;
  /** Integer IRR. UI تومان × 10. */
  price: number;
  collectionId: string;
  status: ProductStatus;
  sizes: number[];
  specs: ProductSpecs;
  imageIds?: string[];
  urls?: string[];
  stock?: number;
};

export type CreatedProduct = {
  id: string;
  name?: string;
  slug?: string;
  status?: ProductStatus;
};

/** Full product as returned by GET /products/:id (create shape; drafts included). */
export type ProductRecord = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  /** Integer IRR. */
  price: number;
  collectionId: string;
  collectionName?: string;
  status: ProductStatus;
  sizes: number[];
  specs: ProductSpecs;
  imageIds: string[];
  urls: string[];
  stock?: number;
};

/** PATCH /products/:id — same keys as create, all optional. */
export type PatchProductRequest = Partial<CreateProductRequest>;

export type ProductEditLoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      product: ProductRecord;
      collections: CollectionOption[];
    };
