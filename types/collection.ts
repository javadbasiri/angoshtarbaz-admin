export type CollectionOption = {
  id: string;
  name: string;
};

/** Fallback catalog when `GET /collections` is unavailable. */
export const FALLBACK_COLLECTIONS: CollectionOption[] = [
  { id: "solitaire", name: "سولیتر" },
  { id: "vintage", name: "وینتیج" },
  { id: "white-gold", name: "طلای سفید" },
];
