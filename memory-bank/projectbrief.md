# Project Brief — Angoshtarbaz Admin

> Snapshot: **2026-11-23** · Repo `d:\Projects\angoshtarbaz\angoshtarbaz-admin` · Branch `main` · HEAD `39d7c9e`

## 1. One-line summary

A separate **Next.js 16 admin panel** (Persian / RTL) for **Angoshtarbaz (انگشترباز)**, a Persian jewelry store. It is the back-office frontend for the catalog and central media library, consuming the NestJS **`angoshtarbaz-backend`** API.

## 2. Core objective

Give a shop administrator a focused, Persian-first interface to operate the Angoshtarbaz store without touching the storefront codebase:

1. **Authenticate** with the Nest admin account (JWT) and keep the token only in an httpOnly cookie.
2. **Manage the product catalog** — list, search, filter, paginate, create drafts/published rings, and edit existing products.
3. **Manage a central media library** — upload images (and, per the UI contract, MP4 video) through a provider-agnostic presign → PUT → register flow, then reuse assets across products via `imageIds[]`.
4. **Optionally organise media in folders** — a feature-flagged folder browser (`NEXT_PUBLIC_GALLERY_FOLDERS=1`) with create/rename/delete/move and per-folder uploads.
5. **Respect the backend contract** — integer IRR prices in the API, Toman in the UI; tolerant response parsing; drafts included for admins.

The panel deliberately does **not** render the storefront, checkout, or customer account area.

## 3. Actors & primary journeys

| Actor | Journey |
| --- | --- |
| Shop admin | Logs in at `/login` → lands on `/` (shell dashboard) → works with products/media |
| Shop admin | `/products` → searches or filters by status → opens a row/card → `/products/[id]/edit` |
| Shop admin | `/products/new` → fills the form with a live storefront-style card preview → saves draft or publishes |
| Shop admin | `/gallery` → drags/drops or selects files → watches progress → selects/deletes assets |
| Shop admin | Product form → «انتخاب از گالری» modal → multi-selects and orders gallery images |
| Shop admin (flag on) | `/gallery?prefix=gallery/rings/red/` → browses the folder tree, creates/renames/deletes folders, moves files |
| Expired session | Any 401 or missing session → cookie cleared → `/login` |

## 4. Implemented scope (milestones in the repo)

| Milestone | Delivered |
| --- | --- |
| **ANG-A0** | Admin shell: sidebar + sticky header + content, brand «انگشترباز» + admin badge, products/gallery nav, orders/settings marked «به‌زودی», responsive hamburger drawer + backdrop under 960px |
| **ANG-A1** | Add product: full form, live card preview, validation, skeleton, success banner/toast, collection loading, gallery upload/picker, `?sample=1` seed |
| **ANG-A2** | Edit product: server-side `GET /products/:id` prefill, `PATCH` save, skeleton / not-found / error+retry / saving / validation / success states, Toman display and IRR write |
| **ANG-A3** | Central media gallery at `/gallery`: presign → browser PUT → register, multi-upload with progress/retry, multi-select/delete, product picker modal |
| **ANG-A4** | Product list at `/products` (alias `/admin/products`): search, status filter, query-string pagination, status counts, table + responsive cards, skeletons/empty/error states |
| **ANG-A5** | Removed the admin BFF/Route Handlers; all Nest calls now happen in Server Components / Server Actions with the httpOnly JWT |
| **ANG-A6** | Folder-first gallery behind `NEXT_PUBLIC_GALLERY_FOLDERS=1`: tree, breadcrumbs, create/rename/delete/move, conflict dialogs, per-folder upload, in-memory stub option |
| **Auth** | JWT login/logout, httpOnly session cookie, route proxy, profile load, session-expiry signalling |
| **DX** | Dependency-free mock API (`npm run mock-api`, port 3002), Node test runner suite, detailed `.env.example` and README |

### Not implemented / out of scope

- Real **orders** and **settings** screens (sidebar placeholders only).
- A real **dashboard** with metrics — `/` is a layout reference with links.
- **Product delete** in the UI (the backend supports `DELETE /products/:id`).
- Storefront, checkout, customer management, i18n switching, dark mode.
- Deployment artifacts (Dockerfile/CI) and a production hosting configuration.

## 5. Domain rules that shape the UI

- **Currency**: UI shows **Toman** with Persian digits/grouping; the API stores integer **IRR**. `1 Toman = 10 IRR` (`lib/format.ts`, `TOMAN_TO_IRR`). Example: `۱۲۸٬۰۰۰٬۰۰۰ تومان` ⇄ `1_280_000_000` IRR.
- **Publication lifecycle**: `draft | published`. Drafts stay admin-only; publishing exposes the product to the storefront.
- **Images**: products attach central gallery records by `imageIds[]`; `urls[]` remains supported. The **first** gallery image is the product card image.
- **Ring sizes**: fixed EU options `50, 52, 54, 56, 58` (`RING_SIZE_OPTIONS`).
- **Jewelry specs**: free-form strings for `weight`, `karat`, `gem`, `cut`, `band`.
- **Slug**: optional; auto-generated from the name, with a known fallback for the sample («انگشتر سولیتر الماس» → `solitaire-diamond-ring`).
- **Sample product**: everywhere the carat is **۰.۸ / 0.8** — never 0.75 / ۰.۷۵. Price `۱۲۸٬۰۰۰٬۰۰۰ تومان`.
- **Persian UI**: `lang="fa"`, `dir="rtl"`, Vazirmatn, Persian digits; code/comments/identifiers remain English.
- **Brand tokens**: Primary `#541926`, Strong `#3F121C`, Secondary `#E0E0E0`, Canvas `#F8F4EC`, Surface `#FFFFFF`, Ink `#1C1917`, Muted `#78716C`, Border `#E7E0D4`.

## 6. Relationship to `angoshtarbaz-backend`

- Backend default origin is `http://localhost:3000` (`PORT || 3000`, no global prefix); the admin runs on `http://localhost:3001`, which matches the backend's default `ADMIN_ORIGIN` / CORS expectation.
- Admin requests are made **server-side** with `Authorization: Bearer <admin JWT>`; only presigned upload bytes go directly from the browser to the storage URL.
- Endpoints used: `POST /auth/login`, `GET /auth/profile`, `GET /collections`, `GET /products`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`, `GET /gallery`, `POST /gallery/presign`, `POST /gallery`, `DELETE /gallery/:id`, plus the optional ANG-A6 `/gallery/browse`, `/gallery/tree`, `/gallery/folders*`, `/gallery/objects*` routes.
- The panel parses several envelope shapes (`{ data }`, `{ data, meta }`, bare arrays, `_id`) so minor backend contract drift does not break rendering.

## 7. Success criteria

- An admin can log in, see the shell, and never receive the JWT in browser JavaScript.
- A new ring can be created as a draft or published, with images selected from the central gallery, and appears in `/products`.
- An existing product loads into the edit form, saves via PATCH, and reflects Persian Toman pricing correctly.
- Gallery upload works with both mock and S3-style presign responses; deleting an asset removes it from the grid.
- `/products` keeps search/status/page in the URL, survives refresh, and shows the correct empty/error/loading state.
- The pure-logic test suite passes (`npm test`).
- The UI remains usable at mobile widths (drawer navigation, card list instead of table).

