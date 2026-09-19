export type GalleryKind = "image" | "video";

export type GalleryAsset = {
  id: string;
  key?: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: GalleryKind;
  createdAt?: string;
};

export type GalleryListMeta = {
  total: number;
  page?: number;
  limit?: number;
};

export type GalleryListResponse = {
  items: GalleryAsset[];
  meta: GalleryListMeta;
};

export type GalleryPresign = {
  uploadUrl: string;
  headers: Record<string, string>;
  key: string;
  publicUrl: string;
  provider?: string;
};

export type GalleryRegisterInput = {
  key: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: GalleryKind;
};
