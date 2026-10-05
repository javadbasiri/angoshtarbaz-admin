import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractProductList,
  parseProductListQuery,
  productListApiPath,
  productListHref,
  type ProductListQuery,
} from "./product-list.ts";

const defaults: ProductListQuery = {
  status: "all",
  search: "",
  page: 1,
  limit: 20,
};

describe("parseProductListQuery", () => {
  it("defaults missing params to all / page 1 / limit 20", () => {
    assert.deepEqual(parseProductListQuery(new URLSearchParams()), defaults);
    assert.deepEqual(parseProductListQuery({}), defaults);
  });

  it("maps status, search, and page", () => {
    assert.deepEqual(
      parseProductListQuery(
        new URLSearchParams("status=draft&search=الماس&page=2"),
      ),
      { status: "draft", search: "الماس", page: 2, limit: 20 },
    );
    assert.equal(
      parseProductListQuery(new URLSearchParams("status=published")).status,
      "published",
    );
  });

  it("falls back when status, page, or limit are invalid", () => {
    assert.deepEqual(
      parseProductListQuery(new URLSearchParams("status=archived&page=0&limit=-5&search=  ")),
      defaults,
    );
    assert.equal(parseProductListQuery(new URLSearchParams("page=3.2")).page, 3);
    assert.equal(parseProductListQuery(new URLSearchParams("limit=500")).limit, 100);
  });

  it("reads the first value from a repeated search param record", () => {
    assert.equal(
      parseProductListQuery({ status: ["published", "draft"], page: ["4"] }).status,
      "published",
    );
    assert.equal(parseProductListQuery({ page: ["4"] }).page, 4);
  });
});

describe("product list URLs", () => {
  it("omits default query params from the browser href", () => {
    assert.equal(productListHref(defaults), "/products");
    assert.equal(
      productListHref({ status: "published", search: "انگشتر", page: 3, limit: 20 }),
      "/products?status=published&search=%D8%A7%D9%86%DA%AF%D8%B4%D8%AA%D8%B1&page=3",
    );
  });

  it("always sends status, page, and limit to the API", () => {
    assert.equal(productListApiPath(defaults), "/products?status=all&page=1&limit=20");
    assert.equal(
      productListApiPath({ status: "draft", search: "prd_1", page: 2, limit: 20 }),
      "/products?status=draft&page=2&limit=20&search=prd_1",
    );
  });
});

describe("extractProductList", () => {
  it("normalizes items and fills meta when the payload is partial", () => {
    const result = extractProductList(
      {
        data: [
          {
            id: "prd_solitaire_01",
            slug: "solitaire-diamond-ring",
            name: "انگشتر سولیتر الماس",
            title: "برلیان ۰.۸ قیراط · طلای ۱۸ عیار",
            price: "1280000000",
            status: "published",
            collection: { name: "سولیتر" },
          },
          { slug: "missing-id" },
          "nope",
        ],
      },
      defaults,
    );

    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.collection, "سولیتر");
    assert.equal(result.data[0]?.price, 1_280_000_000);
    assert.equal(result.data[0]?.currency, "IRR");
    assert.equal(result.data[0]?.thumbnail, "");
    assert.equal(result.meta.total, 1);
    assert.equal(result.meta.totalPages, 1);
    assert.equal(result.meta.hasNext, false);
    assert.equal(result.meta.counts, null);
  });

  it("keeps explicit meta and status counts", () => {
    const result = extractProductList(
      {
        products: [
          {
            id: "prd_1",
            name: "یکی",
            price: 10,
            status: "draft",
            thumbnail: "https://cdn.example/a.jpg",
            imageUrl: "https://cdn.example/b.jpg",
          },
        ],
        meta: {
          page: 2,
          limit: 1,
          total: 3,
          totalPages: 3,
          counts: { all: 8, published: 6, draft: 2 },
        },
      },
      { status: "draft", search: "", page: 2, limit: 1 },
    );

    assert.equal(result.data[0]?.thumbnail, "https://cdn.example/a.jpg");
    assert.equal(result.data[0]?.status, "draft");
    assert.deepEqual(result.meta, {
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
      hasNext: true,
      counts: { all: 8, published: 6, draft: 2 },
    });
  });

  it("does not invent a next page when the backend omits meta and the page is short", () => {
    const result = extractProductList([], defaults);
    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 0);
    assert.equal(result.meta.totalPages, 1);
    assert.equal(result.meta.hasNext, false);
    assert.equal(result.meta.counts, null);
  });
});
