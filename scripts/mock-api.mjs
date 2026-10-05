/**
 * Optional local stand-in for angoshtarbaz-backend when PR #2 / #3 / #4 / #5 is not running.
 * Implements login, create/edit product, GET /products list (ANG-A4), and the ANG-A3 gallery contract
 * (presign → PUT upload → register → list/delete + public file serve).
 *
 * MOCK_PRODUCTS=empty  — start with no products (empty-state screenshots)
 * MOCK_LATENCY_MS=2500 — delay GET /products (loading skeleton)
 *
 *   node scripts/mock-api.mjs
 *   # listens on http://localhost:3001
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_API_PORT || 3001);
const SEED_EMAIL = "admin@angoshtarbaz.local";
const SEED_PASSWORD = "admin123456";

const tokens = new Map();
const products = new Map();
const uploads = new Map();
const galleryAssets = new Map();
const galleryFiles = new Map();

const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4"]);

const collections = [
  { id: "solitaire", name: "سولیتر" },
  { id: "vintage", name: "وینتیج" },
  { id: "white-gold", name: "طلای سفید" },
];

const SEED_SOLITAIRE = {
  id: "prd_solitaire_01",
  name: "انگشتر سولیتر الماس",
  slug: "solitaire-diamond-ring",
  description:
    "سولیتر کلاسیک با نگین برلیان گرد ۰.۸ قیراط، نشسته در بزل چهارچنگ دست‌ساز. رکاب طلای ۱۸ عیار با پرداخت براق — طراحی مینیمال برای درخشش حداکثری نگین.",
  price: 1_280_000_000,
  collectionId: "solitaire",
  status: "published",
  sizes: [50, 52, 54, 56, 58],
  specs: {
    weight: "۳٫۲ گرم",
    karat: "طلای ۱۸ عیار (۷۵۰)",
    gem: "برلیان طبیعی ۰.۸ قیراط · رنگ G · شفافیت VS1",
    cut: "برلیان گرد (Round Brilliant) · ۵۷ وجه",
    band: "طلای زرد ۱۸ عیار · بزل چهارچنگ دست‌ساز",
  },
  imageIds: [],
  urls: [],
  stock: 6,
  title: "برلیان ۰.۸ قیراط · طلای ۱۸ عیار",
  currency: "IRR",
  imageUrl: "",
  thumbnail: "",
  updatedAt: "2026-10-01T12:00:00.000Z",
};

const EXTRA_PRODUCTS = [
  {
    id: "prd_trilogy_02",
    name: "انگشتر سه‌نگین برلیان",
    slug: "trilogy-diamond-ring",
    title: "سه نگین ۰.۳ قیراط · طلای زرد",
    description: "",
    price: 1_540_000_000,
    collectionId: "solitaire",
    status: "draft",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-28T12:00:00.000Z",
  },
  {
    id: "prd_ruby_vintage",
    name: "انگشتر یاقوت سرخ وینتیج",
    slug: "ruby-vintage-ring",
    title: "یاقوت ۱.۲ قیراط · رکاب حکاکی‌شده",
    description: "",
    price: 920_000_000,
    collectionId: "vintage",
    status: "published",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-20T12:00:00.000Z",
  },
  {
    id: "prd_emerald_halo",
    name: "انگشتر زمرد هاله‌ای",
    slug: "emerald-halo-ring",
    title: "زمرد کلمبیا · هاله برلیان",
    description: "",
    price: 865_000_000,
    collectionId: "vintage",
    status: "draft",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-18T12:00:00.000Z",
  },
  {
    id: "prd_sapphire_03",
    name: "انگشتر یاقوت کبود",
    slug: "sapphire-ring",
    title: "یاقوت کبود ۰.۹ قیراط · طلای ۱۸ عیار",
    description: "",
    price: 742_000_000,
    collectionId: "vintage",
    status: "published",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-12T12:00:00.000Z",
  },
  {
    id: "prd_halfset_ring",
    name: "حلقه نیم‌ست برلیان",
    slug: "halfset-ring",
    title: "ردیف برلیان ریز · طلای سفید",
    description: "",
    price: 489_000_000,
    collectionId: "white-gold",
    status: "published",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "prd_pearl_white",
    name: "انگشتر مروارید طلای سفید",
    slug: "pearl-white-ring",
    title: "مروارید آب شیرین · طلای سفید ۱۸ عیار",
    description: "",
    price: 183_000_000,
    collectionId: "white-gold",
    status: "published",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-04T12:00:00.000Z",
  },
  {
    id: "prd_band_white",
    name: "حلقه طلای سفید ساده",
    slug: "white-gold-band",
    title: "عرض ۳ میلی‌متر · پرداخت مات",
    description: "",
    price: 126_000_000,
    collectionId: "white-gold",
    status: "published",
    sizes: [],
    specs: {},
    imageIds: [],
    urls: [],
    currency: "IRR",
    imageUrl: "",
    thumbnail: "",
    updatedAt: "2026-09-01T12:00:00.000Z",
  },
];

if (process.env.MOCK_PRODUCTS !== "empty") {
  products.set(SEED_SOLITAIRE.id, { ...SEED_SOLITAIRE, specs: { ...SEED_SOLITAIRE.specs } });
  for (const product of EXTRA_PRODUCTS) products.set(product.id, product);
}

const LIST_LATENCY_MS = Number(process.env.MOCK_LATENCY_MS || 0);

function collectionNameOf(product) {
  if (typeof product.collection === "string" && product.collection) return product.collection;
  const found = collections.find((item) => item.id === product.collectionId);
  return found ? found.name : "";
}

function toListItem(product) {
  return {
    id: product.id,
    slug: product.slug || "",
    name: product.name || "",
    title: product.title || "",
    price: product.price,
    currency: product.currency || "IRR",
    status: product.status === "published" ? "published" : "draft",
    imageUrl: product.imageUrl || (Array.isArray(product.urls) ? product.urls[0] || "" : ""),
    thumbnail: product.thumbnail || "",
    collection: collectionNameOf(product),
    updatedAt: product.updatedAt || "",
  };
}

function send(res, status, body, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function bearer(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function requireAdmin(req, res, origin) {
  const token = bearer(req);
  const session = token ? tokens.get(token) : null;
  if (!session) {
    send(res, 401, { message: "Unauthorized" }, origin);
    return null;
  }
  return session;
}

function publicOrigin(req) {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  return `http://${host}`;
}

function safeFilename(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function galleryKind(mimeType, filename) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  if (mime.startsWith("video/") || name.endsWith(".mp4")) return "video";
  return "image";
}

function mergeProduct(existing, payload) {
  const next = { ...existing, specs: { ...(existing.specs ?? {}) } };
  if (payload.name != null) next.name = payload.name;
  if (payload.slug != null) next.slug = payload.slug;
  if (payload.description != null) next.description = payload.description;
  if (typeof payload.price === "number") next.price = payload.price;
  if (payload.collectionId != null) next.collectionId = payload.collectionId;
  if (payload.status === "published" || payload.status === "draft") next.status = payload.status;
  if (Array.isArray(payload.sizes)) next.sizes = payload.sizes;
  if (payload.specs && typeof payload.specs === "object") {
    next.specs = { ...next.specs, ...payload.specs };
  }
  if (Array.isArray(payload.imageIds)) next.imageIds = payload.imageIds;
  if (Array.isArray(payload.urls)) next.urls = payload.urls;
  if (typeof payload.stock === "number") next.stock = payload.stock;
  return next;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "http://localhost:3000";
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS") {
    send(res, 204, undefined, origin);
    return;
  }

  try {
    if (req.method === "POST" && url.pathname === "/auth/login") {
      const payload = JSON.parse((await readBody(req)).toString("utf8") || "{}");
      if (payload.email !== SEED_EMAIL || payload.password !== SEED_PASSWORD) {
        send(res, 401, { message: "ایمیل یا رمز عبور نادرست است." }, origin);
        return;
      }
      const accessToken = `mock.${randomUUID()}`;
      tokens.set(accessToken, { email: SEED_EMAIL, role: "admin", name: "ادمین فروشگاه" });
      send(
        res,
        200,
        {
          accessToken,
          user: { email: SEED_EMAIL, role: "admin", name: "ادمین فروشگاه" },
        },
        origin,
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/auth/me") {
      const session = requireAdmin(req, res, origin);
      if (!session) return;
      send(res, 200, { user: session }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/collections") {
      if (!requireAdmin(req, res, origin)) return;
      send(res, 200, { collections }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/gallery/presign") {
      if (!requireAdmin(req, res, origin)) return;
      const payload = JSON.parse((await readBody(req)).toString("utf8") || "{}");
      const filename = payload.filename || "upload.bin";
      const contentType = payload.contentType || payload.mimeType || "application/octet-stream";
      const size = Number(payload.size || 0);
      const kind = galleryKind(contentType, filename);
      if (!ALLOWED_TYPES.has(contentType) && !/\.(jpe?g|png|webp|mp4)$/i.test(filename)) {
        send(res, 400, { message: "قالب فایل پشتیبانی نمی‌شود." }, origin);
        return;
      }
      if (kind === "image" && size > IMAGE_MAX_BYTES) {
        send(res, 400, { message: "حجم تصویر بیش از ۱۲ مگابایت است." }, origin);
        return;
      }
      if (kind === "video" && size > VIDEO_MAX_BYTES) {
        send(res, 400, { message: "حجم ویدیو بیش از ۵۰ مگابایت است." }, origin);
        return;
      }
      const key = `gallery/${randomUUID()}-${safeFilename(filename)}`;
      send(
        res,
        200,
        {
          uploadUrl: `${publicOrigin(req)}/gallery/upload/${key}`,
          headers: { "Content-Type": contentType },
          key,
          publicUrl: `${publicOrigin(req)}/gallery/files/${key}`,
          provider: "mock",
        },
        origin,
      );
      return;
    }

    const uploadMatch = url.pathname.match(/^\/gallery\/upload\/(.+)$/);
    if (uploadMatch && req.method === "PUT") {
      if (!requireAdmin(req, res, origin)) return;
      const key = decodeURIComponent(uploadMatch[1]);
      const buffer = await readBody(req);
      const contentType = req.headers["content-type"] || "application/octet-stream";
      galleryFiles.set(key, { buffer, contentType, filename: key.split("/").pop() || key });
      send(res, 204, undefined, origin);
      return;
    }

    const fileMatch = url.pathname.match(/^\/gallery\/files\/(.+)$/);
    if (fileMatch && req.method === "GET") {
      const key = decodeURIComponent(fileMatch[1]);
      const file = galleryFiles.get(key);
      if (!file) {
        send(res, 404, { message: "File not found" }, origin);
        return;
      }
      res.writeHead(200, {
        "Content-Type": file.contentType,
        "Content-Length": file.buffer.length,
        "Access-Control-Allow-Origin": origin || "*",
        "Cache-Control": "public, max-age=3600",
      });
      res.end(file.buffer);
      return;
    }

    if (req.method === "POST" && url.pathname === "/gallery") {
      if (!requireAdmin(req, res, origin)) return;
      const payload = JSON.parse((await readBody(req)).toString("utf8") || "{}");
      const key = payload.key;
      if (!key || typeof key !== "string") {
        send(res, 400, { message: "key is required." }, origin);
        return;
      }
      const file = galleryFiles.get(key);
      if (!file) {
        send(res, 400, { message: "فایل هنوز آپلود نشده است." }, origin);
        return;
      }
      const id = randomUUID();
      const filename = payload.filename || payload.originalName || file.filename;
      const mimeType = payload.mimeType || payload.contentType || file.contentType;
      const asset = {
        id,
        key,
        publicUrl: payload.publicUrl || `${publicOrigin(req)}/gallery/files/${key}`,
        filename,
        mimeType,
        size: payload.size ?? file.buffer.length,
        kind: payload.kind === "video" || payload.kind === "image" ? payload.kind : galleryKind(mimeType, filename),
        createdAt: new Date().toISOString(),
      };
      galleryAssets.set(id, asset);
      send(res, 201, asset, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/gallery") {
      if (!requireAdmin(req, res, origin)) return;
      const data = [...galleryAssets.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
      send(res, 200, { data, meta: { total: data.length } }, origin);
      return;
    }

    const galleryItemMatch = url.pathname.match(/^\/gallery\/([^/]+)$/);
    if (galleryItemMatch && req.method === "DELETE") {
      if (!requireAdmin(req, res, origin)) return;
      const id = decodeURIComponent(galleryItemMatch[1]);
      const asset = galleryAssets.get(id);
      if (!asset) {
        send(res, 404, { message: "Gallery item not found" }, origin);
        return;
      }
      galleryAssets.delete(id);
      if (asset.key) galleryFiles.delete(asset.key);
      send(res, 204, undefined, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/uploads") {
      if (!requireAdmin(req, res, origin)) return;
      const id = randomUUID();
      const record = { id, url: `https://cdn.local/mock/${id}.jpg` };
      uploads.set(id, record);
      send(res, 201, record, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/products") {
      if (!requireAdmin(req, res, origin)) return;
      if (LIST_LATENCY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, LIST_LATENCY_MS));
      }
      const status = url.searchParams.get("status") || "all";
      const search = (url.searchParams.get("search") || "").trim().toLowerCase();
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
      const limitRaw = Number.parseInt(url.searchParams.get("limit") || "20", 10);
      const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20));
      let items = [...products.values()];
      if (status === "published" || status === "draft") {
        items = items.filter((product) => product.status === status);
      }
      if (search) {
        items = items.filter((product) => {
          const haystack = [
            product.name,
            product.title,
            product.slug,
            product.id,
            collectionNameOf(product),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        });
      }
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      const data = items.slice((page - 1) * limit, page * limit).map(toListItem);
      send(res, 200, { data, meta: { page, limit, total, totalPages } }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/products") {
      if (!requireAdmin(req, res, origin)) return;
      const payload = JSON.parse((await readBody(req)).toString("utf8") || "{}");
      if (!payload.name || !payload.collectionId || typeof payload.price !== "number") {
        send(res, 400, { message: "name, collectionId and numeric price are required." }, origin);
        return;
      }
      const id = randomUUID();
      const product = {
        id,
        name: payload.name,
        slug: payload.slug || `product-${id.slice(0, 8)}`,
        description: payload.description ?? "",
        price: payload.price,
        collectionId: payload.collectionId,
        status: payload.status === "published" ? "published" : "draft",
        sizes: payload.sizes ?? [],
        specs: payload.specs ?? {},
        imageIds: payload.imageIds ?? [],
        urls: payload.urls ?? [],
        stock: payload.stock ?? 0,
        title: payload.title || "",
        currency: "IRR",
        imageUrl: Array.isArray(payload.urls) ? payload.urls[0] || "" : "",
        thumbnail: "",
        updatedAt: new Date().toISOString(),
      };
      products.set(id, product);
      send(res, 201, product, origin);
      return;
    }

    const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const id = decodeURIComponent(productMatch[1]);
      const product = products.get(id);

      if (req.method === "GET") {
        // Backend PR #3: GET /products/:id is public and includes drafts.
        if (!product) {
          send(res, 404, { message: "Product not found" }, origin);
          return;
        }
        send(res, 200, product, origin);
        return;
      }

      if (req.method === "PATCH") {
        if (!requireAdmin(req, res, origin)) return;
        if (!product) {
          send(res, 404, { message: "Product not found" }, origin);
          return;
        }
        const payload = JSON.parse((await readBody(req)).toString("utf8") || "{}");
        if (payload.price != null && typeof payload.price !== "number") {
          send(res, 400, { message: "price must be a number (IRR)." }, origin);
          return;
        }
        const next = mergeProduct(product, payload);
        products.set(id, next);
        send(res, 200, next, origin);
        return;
      }
    }

    send(res, 404, { message: `No mock route for ${req.method} ${url.pathname}` }, origin);
  } catch (error) {
    send(res, 500, { message: error instanceof Error ? error.message : "mock error" }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`angoshtarbaz mock API listening on http://localhost:${PORT}`);
  console.log(`seed: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`sample product GET /products/${SEED_SOLITAIRE.id}`);
  console.log("list: GET /products?status=&search=&page=&limit= (JWT)");
  console.log("gallery: POST /gallery/presign · PUT /gallery/upload/:key · POST/GET /gallery");
});
