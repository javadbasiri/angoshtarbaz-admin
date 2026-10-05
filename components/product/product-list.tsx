"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { formatIrrAsToman, toPersianDigits } from "@/lib/format";
import {
  productDisplayName,
  productEditHref,
  productListHref,
  productSubline,
  productThumbSrc,
  type ProductListItem,
  type ProductListLoad,
  type ProductListQuery,
  type ProductListResponse,
  type ProductStatusCounts,
} from "@/lib/product-list";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: { value: ProductListQuery["status"]; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشر" },
  { value: "draft", label: "پیش‌نویس" },
];

const SKELETON_WIDTHS = ["62%", "54%", "70%", "48%", "58%", "66%"];

function RingGlyph({ size }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M18 14l6-6 6 6-6 5z" />
      <circle cx="24" cy="31" r="10" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg className="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function EditGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg className="pcard__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function PriceLabel({ irr }: { irr: number }) {
  const label = formatIrrAsToman(irr);
  const splitAt = label.lastIndexOf(" ");
  const amount = splitAt === -1 ? label : label.slice(0, splitAt);
  const unit = splitAt === -1 ? "" : label.slice(splitAt + 1);
  return (
    <span className="price">
      {amount}
      {unit ? <span className="price__unit">{unit}</span> : null}
    </span>
  );
}

function StatusBadge({ status }: { status: ProductListItem["status"] }) {
  const published = status === "published";
  return (
    <span className={`status-badge status-badge--${published ? "published" : "draft"}`}>
      {published ? "منتشر" : "پیش‌نویس"}
    </span>
  );
}

function ProductThumb({ item, index }: { item: ProductListItem; index: number }) {
  const src = productThumbSrc(item);
  const [failed, setFailed] = useState(false);
  const variant = (index % 8) + 1;
  return (
    <span className={`thumb thumb--${variant}`}>
      {src && !failed ? (
        // Remote catalog URLs are not configured for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <RingGlyph />
      )}
    </span>
  );
}

function summaryText(shown: number, total: number | null): string {
  if (total == null) return `نمایش ${toPersianDigits(shown)} محصول`;
  return `نمایش ${toPersianDigits(shown)} از ${toPersianDigits(total)} محصول`;
}

function headMetaText(
  result: ProductListResponse | null,
  catalogEmpty: boolean,
): string {
  if (catalogEmpty) return "هنوز محصولی ثبت نشده";
  const counts = result?.meta.counts;
  if (
    counts &&
    counts.all != null &&
    counts.published != null &&
    counts.draft != null
  ) {
    return `${toPersianDigits(counts.all)} محصول · ${toPersianDigits(counts.published)} منتشر · ${toPersianDigits(counts.draft)} پیش‌نویس`;
  }
  const total = result?.meta.total;
  if (total != null) return `${toPersianDigits(total)} محصول`;
  if (result) return `${toPersianDigits(result.data.length)} محصول`;
  return "";
}

function ListHead({
  loading,
  metaText,
}: {
  loading?: boolean;
  metaText?: string;
}) {
  return (
    <div className="list-head">
      <div>
        <h2 className="list-head__title">فهرست محصولات</h2>
        {loading ? (
          <p className="list-head__meta" aria-hidden="true">
            <span className="sk sk--text" style={{ display: "inline-block", width: 180, verticalAlign: "middle" }} />
          </p>
        ) : (
          <p className="list-head__meta">
            {metaText}
            {" · "}
            <span className="list-head__route" dir="ltr">
              /products
            </span>
          </p>
        )}
      </div>
      <Link className="btn btn--primary list-head__cta" href="/products/new">
        <PlusIcon />
        افزودن محصول
      </Link>
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="list-toolbar" aria-hidden="true">
      <div className="sk sk--input" />
      <div className="list-toolbar__pills">
        <span className="sk sk--pill" style={{ width: 76, height: 36 }} />
        <span className="sk sk--pill" style={{ width: 84, height: 36 }} />
        <span className="sk sk--pill" style={{ width: 104, height: 36 }} />
      </div>
    </div>
  );
}

function SkeletonBody() {
  return (
    <>
      <span className="sr-only" role="status">
        در حال بارگذاری فهرست محصولات…
      </span>
      <table className="ptable" aria-hidden="true">
        <thead>
          <tr>
            <th scope="col">محصول</th>
            <th scope="col">کالکشن</th>
            <th scope="col">قیمت</th>
            <th scope="col">وضعیت</th>
            <th scope="col" className="col-actions">
              <span className="sr-only">عملیات</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {SKELETON_WIDTHS.map((width) => (
            <tr key={width}>
              <td>
                <div className="pcell">
                  <span className="sk sk--thumb" />
                  <div className="sk-stack">
                    <span className="sk sk--text" style={{ width }} />
                    <span className="sk sk--text" style={{ width: "40%", height: 10 }} />
                  </div>
                </div>
              </td>
              <td>
                <span className="sk sk--pill" style={{ width: 70 }} />
              </td>
              <td>
                <span className="sk sk--text" style={{ display: "block", width: 120 }} />
              </td>
              <td>
                <span className="sk sk--pill" />
              </td>
              <td className="col-actions">
                <span className="sk sk--pill" style={{ display: "block", width: 78, height: 32, borderRadius: 8 }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="pcards" role="list" aria-hidden="true">
        {SKELETON_WIDTHS.map((width) => (
          <li key={width}>
            <div className="pcard">
              <span className="sk sk--thumb" />
              <span className="sk-stack">
                <span className="sk sk--text" style={{ width }} />
                <span className="sk sk--text" style={{ width: "44%", height: 10 }} />
                <span className="sk sk--text" style={{ width: "40%" }} />
                <span className="sk sk--pill" style={{ height: 20, width: 64 }} />
              </span>
              <span />
            </div>
          </li>
        ))}
      </ul>
      <div className="list-footer" aria-hidden="true">
        <span className="sk sk--text list-footer__summary" style={{ width: 140 }} />
        <span className="sk sk--pill" style={{ width: 110, height: 32, borderRadius: 8 }} />
      </div>
    </>
  );
}

function PanelSkeleton() {
  return (
    <section className="list-panel" aria-busy="true" aria-label="در حال بارگذاری محصولات">
      <SkeletonBody />
    </section>
  );
}

export function ProductListSkeleton() {
  return (
    <div className="products-page" aria-busy="true">
      <ListHead loading />
      <ToolbarSkeleton />
      <PanelSkeleton />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="list-empty">
      <div className="list-empty__art" aria-hidden="true">
        <RingGlyph size={44} />
      </div>
      <h3 className="list-empty__title">اولین انگشتر را اضافه کنید</h3>
      <p className="list-empty__body">
        فهرست محصولات انگشترباز خالی است. محصول جدید بسازید، قیمت و موجودی را وارد کنید و به‌صورت
        پیش‌نویس ذخیره یا منتشر کنید.
      </p>
      <div className="list-empty__actions">
        <Link className="btn btn--primary" href="/products/new">
          <PlusIcon />
          افزودن محصول
        </Link>
        <Link className="btn btn--secondary" href="/gallery">
          آپلود تصاویر در گالری
        </Link>
      </div>
      <div className="list-empty__steps">
        <div className="list-empty__step">
          <span className="list-empty__num">۱</span>
          <b>اطلاعات پایه</b>
          نام، قیمت (تومان) و کالکشن
        </div>
        <div className="list-empty__step">
          <span className="list-empty__num">۲</span>
          <b>تصاویر</b>
          انتخاب از گالری رسانه
        </div>
        <div className="list-empty__step">
          <span className="list-empty__num">۳</span>
          <b>انتشار</b>
          پیش‌نویس یا منتشر
        </div>
      </div>
    </div>
  );
}

function ProductRow({ item, index }: { item: ProductListItem; index: number }) {
  const router = useRouter();
  const href = productEditHref(item.id);
  const name = productDisplayName(item);
  const subline = productSubline(item);

  return (
    <tr
      data-href={href}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button")) return;
        router.push(href);
      }}
    >
      <td>
        <div className="pcell">
          <ProductThumb item={item} index={index} />
          <div>
            <Link className="pcell__name" href={href}>
              {name}
            </Link>
            {subline ? <span className="pcell__sub">{subline}</span> : null}
            <span className="pcell__id" dir="ltr">
              {item.id}
            </span>
          </div>
        </div>
      </td>
      <td>
        {item.collection ? (
          <span className="collection-tag">{item.collection}</span>
        ) : (
          <span className="pcell__sub">—</span>
        )}
      </td>
      <td className="col-price">
        <PriceLabel irr={item.price} />
      </td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td className="col-actions">
        <Link className="row-edit" href={href} aria-label={`ویرایش ${name}`}>
          <EditGlyph />
          ویرایش
        </Link>
      </td>
    </tr>
  );
}

function ProductCard({ item, index }: { item: ProductListItem; index: number }) {
  const name = productDisplayName(item);
  const subline = productSubline(item);
  const meta = [item.collection, subline].filter(Boolean).join(" · ");
  return (
    <li>
      <Link className="pcard" href={productEditHref(item.id)} aria-label={`ویرایش ${name}`}>
        <ProductThumb item={item} index={index} />
        <span className="pcard__body">
          <span className="pcard__name">{name}</span>
          {meta ? <span className="pcard__meta">{meta}</span> : null}
          <PriceLabel irr={item.price} />
          <span className="pcard__row">
            <StatusBadge status={item.status} />
          </span>
        </span>
        <ChevronGlyph />
      </Link>
    </li>
  );
}

export function ProductList({
  query,
  load,
}: {
  query: ProductListQuery;
  load: Exclude<ProductListLoad, { status: "unauthorized" }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(query.search);
  const lastSearch = useRef(query.search);
  const result: ProductListResponse | null = load.status === "ready" ? load.result : null;

  useEffect(() => {
    if (query.search !== lastSearch.current) {
      lastSearch.current = query.search;
      setDraft(query.search);
    }
  }, [query.search]);

  function navigate(href: string, mode: "push" | "replace") {
    startTransition(() => {
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === query.search) return;
    const timer = window.setTimeout(() => {
      if (lastSearch.current === next) return;
      lastSearch.current = next;
      startTransition(() => {
        router.replace(productListHref({ ...query, search: next, page: 1 }), { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, query, router, startTransition]);

  function go(patch: Partial<ProductListQuery>, mode: "push" | "replace" = "push") {
    const next: ProductListQuery = {
      ...query,
      ...patch,
      search: patch.search !== undefined ? patch.search : draft.trim(),
    };
    lastSearch.current = next.search;
    setDraft(next.search);
    navigate(productListHref(next), mode);
  }

  const catalogEmpty =
    !isPending &&
    result != null &&
    query.status === "all" &&
    query.search === "" &&
    query.page <= 1 &&
    result.data.length === 0 &&
    (result.meta.total === 0 || result.meta.total == null);

  const noResults = !isPending && result != null && !catalogEmpty && result.data.length === 0;
  const counts: ProductStatusCounts | null = catalogEmpty
    ? { all: 0, published: 0, draft: 0 }
    : (result?.meta.counts ?? null);

  return (
    <div className="products-page">
      <ListHead metaText={headMetaText(result, catalogEmpty)} />
      <div className={`list-toolbar${catalogEmpty ? " is-disabled-ui" : ""}`} role="search">
        <label className="search">
          <span className="sr-only">جستجوی محصول</span>
          <SearchGlyph />
          <input
            className="input"
            type="search"
            value={draft}
            placeholder="جستجو در نام یا شناسه محصول…"
            autoComplete="off"
            disabled={catalogEmpty}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="status-filter" role="tablist" aria-label="فیلتر وضعیت">
          {STATUS_OPTIONS.map((option) => {
            const active = query.status === option.value;
            const count = counts?.[option.value];
            return (
              <button
                key={option.value}
                type="button"
                className={`status-filter__btn${active ? " is-active" : ""}`}
                role="tab"
                aria-selected={active}
                disabled={catalogEmpty}
                onClick={() => {
                  if (option.value === query.status) return;
                  go({ status: option.value, page: 1 });
                }}
              >
                {option.label}
                {count != null ? (
                  <span className="status-filter__count">{toPersianDigits(count)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {isPending ? (
        <PanelSkeleton />
      ) : (
        <section className="list-panel" aria-label="فهرست محصولات">
            {load.status === "error" ? (
              <div className="list-error" role="alert">
                <h3 className="list-error__title">بارگذاری فهرست ناموفق بود</h3>
                <p className="list-error__body">{load.message}</p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => startTransition(() => router.refresh())}
                >
                  تلاش مجدد
                </button>
              </div>
            ) : null}
            {catalogEmpty ? <EmptyState /> : null}
            {noResults ? (
              <div className="no-results" role="status">
                <strong>محصولی با این مشخصات پیدا نشد</strong>
                عبارت جستجو یا فیلتر وضعیت را تغییر دهید.
                <div className="no-results__actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => go({ status: "all", search: "", page: 1 }, "replace")}
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              </div>
            ) : null}
            {result && result.data.length > 0 ? (
              <>
                <table className="ptable">
                  <thead>
                    <tr>
                      <th scope="col">محصول</th>
                      <th scope="col">کالکشن</th>
                      <th scope="col">قیمت</th>
                      <th scope="col">وضعیت</th>
                      <th scope="col" className="col-actions">
                        <span className="sr-only">عملیات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((item, index) => (
                      <ProductRow key={item.id} item={item} index={index} />
                    ))}
                  </tbody>
                </table>
                <ul className="pcards" role="list">
                  {result.data.map((item, index) => (
                    <ProductCard key={item.id} item={item} index={index} />
                  ))}
                </ul>
              </>
            ) : null}
            {result && !catalogEmpty ? (
              <div className="list-footer">
                <span className="list-footer__summary">
                  {summaryText(result.data.length, result.meta.total)}
                </span>
                <div className="pager" aria-label="صفحه‌بندی">
                  <button
                    type="button"
                    className="pager__btn"
                    disabled={result.meta.page <= 1}
                    aria-label="صفحه قبل"
                    onClick={() => go({ page: result.meta.page - 1 })}
                  >
                    ›
                  </button>
                  <button type="button" className="pager__btn is-current" aria-current="page">
                    {toPersianDigits(result.meta.page)}
                  </button>
                  <button
                    type="button"
                    className="pager__btn"
                    disabled={!result.meta.hasNext}
                    aria-label="صفحه بعد"
                    onClick={() => go({ page: result.meta.page + 1 })}
                  >
                    ‹
                  </button>
                </div>
              </div>
            ) : null}
        </section>
      )}
    </div>
  );
}
