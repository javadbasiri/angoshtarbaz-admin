# Progress — Angoshtarbaz Admin

> Snapshot: **2026-11-23** · Branch `main` · HEAD `39d7c9e` ("Merge pull request #9 … gallery-folders-ui", 2026-10-24) · working tree clean except untracked `memory-bank/`

## 1. Status at a glance

| Area | State |
| --- | --- |
| Feature implementation | ✅ All planned ANG-A0 … ANG-A6 admin scopes are implemented in the repo |
| Auth & session | ✅ JWT login/logout, httpOnly cookie, proxy gate, profile load, expiry handling |
| Product list | ✅ Search, status filter, pagination, counts, responsive table/cards, all states |
| Product create/edit | ✅ Full form, live preview, validation, gallery attach, POST/PATCH |
| Media gallery | ✅ Flat library, presign upload, multi-select/delete, product picker |
| Folder gallery | ⚠️ UI complete behind a build-time flag; Nest endpoints not present in the backend snapshot |
| Build | ⚠️ Not verified here — `node_modules/` is absent, so `next build` / `next dev` / `eslint` cannot run |
| Unit tests | ✅ `npm test` → **51 tests / 22 suites, 51 pass, 0 fail** on Node 22.19.0 (dependency-free tests) |
| Component/E2E tests | ❌ None |
| CI / deploy | ❌ No CI workflow, no Dockerfile (deployment explicitly out of scope) |

## 2. Implemented features

### Authentication & session
- `/login` page with branded card, seed credentials hint, Suspense boundary, inline error alert, pending spinner.
- `loginAction` (`lib/auth-actions.ts`): validates input, calls `POST /auth/login`, extracts the JWT from common payloads, rejects non-admin roles, sets the httpOnly cookie.
- `proxy.ts`: redirects unauthenticated users to `/login?next=…`, bounces authenticated document GETs of `/login`, lets POST/Server Actions through.
- `loadCurrentUser` (`GET /auth/profile`) on every shell render; graceful fallback name «ادمین فروشگاه».
- 401 handling in actions clears the cookie (`callAdminBackend`); the client event `angoshtarbaz-admin-session-expired` clears it via `expireAdminSession` and hard-navigates to `/login`.
- Header user menu with logout (`logoutAction` clears cookie + redirects).
- Rich login diagnostics: detects API URL pointing at the admin itself, HTML responses, origin equality, unreachable backend; redacts JWTs/passwords.

### Shell (ANG-A0)
- `AdminShell` layout: sidebar + sticky header + content area, brand «انگشترباز» and admin badge.
- Navigation: محصولات (`/products`), رسانه / گالری (`/gallery`); سفارشات and تنظیمات are «به‌زودی» placeholders.
- Header breadcrumb/eyebrow/title, user chip + dropdown, menu toggle.
- Mobile drawer + backdrop under 960px, Escape to close, body scroll lock.
- `/` dashboard is a layout reference with quick links; `/dashboard` redirects to `/`.
- Legacy `/admin*` routes redirect to canonical paths (list query string preserved).

### Product list (ANG-A4)
- `/products` server page parses `status`, `search`, `page`, `limit` from the query string (default limit 20, max 100, search capped at 200 chars).
- Server calls `GET /products?status=&page=&limit=&search=` with the admin JWT; drafts included (`status=all` sent explicitly).
- Tolerant response normalisation (items, meta, counts) with inferred total/pages/hasNext.
- UI: status pills with counts, debounced search (300 ms), skeleton during transitions, responsive table + card list, empty catalog onboarding, no-results state with clear filters, error card with retry, prev/next pager.
- Row/card click navigates to `/products/[id]/edit`; edit link per row; «افزودن محصول» CTA.
- Stock is intentionally **not** a list column.

### Create product (ANG-A1)
- `/products/new`, optional `?sample=1` fills the official sample (۰.۸ قیراط, ۱۲۸٬۰۰۰٬۰۰۰ تومان).
- Fields: name, slug (+ auto-generate), description, price (Toman, Persian grouping), collection, stock, publication status, sizes (50–58), specs (weight/karat/gem/cut/band), gallery.
- Live storefront-style card preview (image, title, meta line, Toman price).
- Validation: name, positive price, collection; field errors + summary alert.
- Save draft / publish actions with per-action spinner, success banner, toast; `POST /products` then `GET /products/:id` confirmation.
- Collections loaded via `loadCollectionsAction` with `FALLBACK_COLLECTIONS`; sample collection remapped to a backend id when available.
- Local image previews + upload via the gallery pipeline; picker modal for existing assets.

### Edit product (ANG-A2)
- `/products/[id]/edit` server-loads `GET /products/:id` + `GET /collections` for first paint (`loadProductForEdit`).
- States: unauthorized → ExpireSession + skeleton; 404 → not-found card; error → retry card; ready → form.
- Prefill via `productToFormValues` (IRR→Toman, size filtering, gallery pairing).
- `PATCH /products/:id` via `updateProductAction`; draft and primary save, saving banner, success banner/toast, breadcrumb collection → product → «ویرایش».
- Shows product id and route for debugging.
- Gallery hydration by remote ids from the central library.

### Media gallery (ANG-A3)
- `/gallery` flat library (default): loads up to 100 assets, count summary (files/images/videos/uploading/failed).
- Multi-file upload from picker or drag/drop with validation, progress bars, retry, dismiss, rejected-file banner.
- Selection mode, select all, clear, batch delete (sequential with partial-failure banner), per-tile delete.
- Video badge; placeholder classes for missing media; skeleton, empty dropzone, compact dropzone, error banner, toast.
- `GalleryPickerModal` on both product forms: load library, filter images/videos, ordered multi-select, move/remove, confirm.
- Upload pipeline: presign (server JWT) → browser PUT (no JWT, progress) → register (server) → insert asset / attach `imageIds[]`.

### Folder gallery (ANG-A6, flagged)
- `/gallery` switches to `GalleryFoldersLibrary` when `NEXT_PUBLIC_GALLERY_FOLDERS=1` / `true`.
- Folder tree sidebar with expand/collapse, counts, active folder, rename/delete actions; breadcrumbs; `?prefix=` navigation.
- Create folder, rename, delete-empty (blocked with count dialog), move files with `replace | autoRename | skip` conflict handling.
- Upload into the current prefix with progress/retry; multi-select and bulk delete by key.
- In-memory stub (`NEXT_PUBLIC_GALLERY_FOLDERS_STUB=1`) mirrors the contract for offline UI review, including `.keep` empty-folder markers.
- Nest adapter implemented through Server Actions; **backend folder routes are not present in the backend snapshot yet**.

### Platform / DX
- `lib/env.ts` normalises the API origin (blank values ignored, trailing slash trimmed, legacy alias supported) and parses feature flags.
- `scripts/mock-api.mjs`: zero-dependency local API on `:3002` for login/profile, collections, product list/detail/create/patch, and the flat gallery presign/upload/register/list/delete flow; `MOCK_PRODUCTS=empty`, `MOCK_LATENCY_MS`, `MOCK_API_PORT`.
- Node test runner suite for pure logic (see §4).
- `.env.example` and README document ports, CORS, seeds, API mapping, pricing, gallery flow, folder contract, scripts and routes.
- Extensive empty/loading/error states, Persian copy, RTL layout, semantic ARIA roles, responsive design.

## 3. Recent history (git)

| Commit | Change |
| --- | --- |
| `39d7c9e` | Merge PR #9 — wire ANG-A6 gallery folders to Nest |
| `2141916` | ANG-A6 gallery folder UI behind a feature flag |
| `faa2e1e` | Align gallery presign/register bodies with Nest (PR #8) |
| `a38fbf2` | Ignore blank API env; allow login Server Actions through the proxy |
| `c848495` | Default API to Nest `:3000`; run admin on `:3001` |
| `514a58a` | Match profile and presigned gallery upload contracts |
| `dcf52b1` | Remove the admin BFF; call Nest directly (ANG-A5) |
| `03c7e36` | Add ANG-A4 admin product list |
| `0921b6d` | Implement ANG-A3 central media gallery and product picker |
| `16810a1` | Load edit product on the server for first paint |
| `dbeeb23` | Implement ANG-A2 product edit UI with GET/PATCH |
| `442c123` | Implement ANG-A0 shell, JWT login, and ANG-A1 add product |

## 4. Test inventory

Command: `npm test` → `node --experimental-strip-types --test <7 files>`

Last verified run (2026-11-23):

```
tests 51
suites 22
pass 51
fail 0
duration_ms ≈ 442
```

| File | Suites | Focus |
| --- | --- | --- |
| `lib/format.test.ts` | 1 | IRR→Toman formatting, grouping, zero/non-finite |
| `lib/product-list.test.ts` | 3 | Query parsing, href vs API path, list/meta extraction |
| `lib/admin-display.test.ts` | 1 | Display-name fallbacks |
| `lib/gallery-upload-target.test.ts` | 2 | Upload URL absolutisation, header stripping, S3/mock targets |
| `lib/gallery-payload.test.ts` | 4 | Presign/register bodies, asset/presign parsers |
| `lib/login-response.test.ts` | 4 | Token extraction, redaction, diagnostics, unreachable copy |
| `lib/gallery-folders.test.ts` | 7 | Flag parsing, paths, stub CRUD/move/keep, breadcrumbs, prefix resolution, Nest parsers |

Warnings: each file emits `MODULE_TYPELESS_PACKAGE_JSON` because `package.json` lacks `"type": "module"`; tests still pass.

## 5. Known issues, gaps & risks

1. **Build/lint not verified in this environment.** `node_modules/` is absent (`.gitignore`d) and no install was performed, so `next build`, `next dev` and `eslint` could not be run. `npm test` works because the tests only import pure `lib/*.ts` files.
2. **Node test-runner warnings.** Every test file logs `MODULE_TYPELESS_PACKAGE_JSON` / ESM reparse warnings. Fix by adding `"type": "module"` (requires checking Next compatibility) or renaming tests to `.mts`.
3. **ANG-A6 folder backend is missing.** The backend snapshot exposes only flat gallery routes; `GET /gallery/browse`, `/gallery/tree`, `/gallery/folders*` and `/gallery/objects*` are not implemented. With `NEXT_PUBLIC_GALLERY_FOLDERS=1` and the stub off, the folder UI will fail against the current backend.
4. **Gallery limits disagree with the backend.** The UI accepts images up to 12 MB and MP4 up to 50 MB; the backend allowlist is images only (`jpeg/jpg/png/webp/gif/avif`) up to **10 MiB**. Video and >10 MiB uploads will be rejected at presign/register. Decide whether the backend will support video or the UI should hide it.
5. **Mock API is flat-gallery only.** It has no folder routes and no product `DELETE`; it also ignores `limit` for gallery listings. It cannot validate ANG-A6 behaviour end-to-end.
6. **No product delete in the UI.** The backend supports `DELETE /products/:id`; the admin exposes create/read/update only.
7. **Flat gallery is capped at 100 assets.** `listGalleryAction(100)` fetches one page; there is no pagination or "load more" despite the backend returning `meta`.
8. **Dashboard/orders/settings are placeholders.** `/` is a shell reference, and orders/settings are disabled «به‌زودی» nav items.
9. **No route-level error boundaries.** There is no `error.tsx`, `not-found.tsx`, or `global-error.tsx`; unexpected render errors fall back to Next's default UI.
10. **No component, integration, or E2E tests, and no CI.** Only pure helpers are tested; there is no Dockerfile or deployment workflow.
11. **Remote images bypass `next/image`.** Product thumbs and gallery previews use plain `<img>` with `eslint-disable @next/next/no-img-element` because no image domains are configured. This loses optimisation and lazy sizing.
12. **Feature flags are build-time.** `NEXT_PUBLIC_GALLERY_FOLDERS` / `_STUB` changes require a dev-server restart or rebuild; operators may expect runtime toggles.
13. **Proxy checks cookie presence only.** An expired/invalid JWT passes the proxy and is caught later by the profile call, briefly rendering the shell/skeleton before the expiry redirect.
14. **Session lifetime is a fixed 7-day JWT.** No refresh, rotation, revocation, or server-side logout; clearing the cookie does not invalidate the token at the backend.
15. **`ProductEditor` owns its own `AdminShell`.** The edit page wraps only the unauthorized fallback; this differs from every other page and makes chrome composition inconsistent.
16. **Test file list is hard-coded** in `package.json`; new test files silently do not run unless added.
17. **Minor UX inconsistency:** the edit form's «انصراف» link goes to `/` rather than back to `/products`.
18. **API contract documentation lives in README only.** There is no generated client or schema; payload changes must be mirrored manually in `lib/gallery.ts`, `lib/product-map.ts`, and the README.
19. **Proxy `next` redirect is not validated.** An authenticated request to `/login?next=//evil.example` can redirect off-site via `new URL(next, request.url)` in `proxy.ts`. The login form validates `next`, but the proxy should apply the same same-origin check.

## 6. Suggested next steps

1. **Install and verify the toolchain**: `npm install`, then `npm run lint` and `npm run build`; smoke-test `npm run dev` against the backend or mock API.
2. **Reconcile the gallery contract**: align client MIME/size validation with the backend (or extend the backend), and hide video affordances until supported.
3. **Land the ANG-A6 backend routes** (or keep the flag off) and either extend the mock API or document `NEXT_PUBLIC_GALLERY_FOLDERS_STUB=1` as the offline path.
4. **Add product delete** to the edit page/list with a confirmation dialog and `deleteProductAction`.
5. **Add gallery pagination / load-more** using the existing `meta` envelope.
6. **Replace the placeholder dashboard** with real counts (products, drafts, media) and implement orders/settings if they enter scope.
7. **Add `error.tsx` / `not-found.tsx`** boundaries plus missing `loading.tsx` files for gallery/new/edit.
8. **Introduce component/E2E tests** (Testing Library or Playwright) and a CI workflow that runs lint, build and tests.
9. **Improve auth hardening**: shorter access token + refresh/rotation or server-side revocation; revisit CSRF/rate-limit expectations with the backend.
10. **Silence the test warnings** (`"type": "module"` or `.mts`) and centralise the test file list (e.g. a glob script).
11. **Configure `next/image`** for the gallery/API origins (or keep `<img>` deliberately and document why) to regain optimisation.
12. **Add deployment configuration** (Dockerfile, env checklist, `ADMIN_ORIGIN` alignment) when deployment enters scope.

## 7. Verification log (2026-11-23)

- Read `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example`, `README.md`, `proxy.ts`, every page/layout under `app/`, all components, all `lib/` modules, `types/`, and `scripts/mock-api.mjs`.
- Checked backend contracts in `d:\Projects\angoshtarbaz\angoshtarbaz-backend` (`gallery.constants.ts`, `gallery.controller.ts`, `API.md`, `package.json`) to validate gallery MIME/size limits and available folder routes.
- `git log` / `git status`: HEAD `39d7c9e`, clean tree except the untracked `memory-bank/` folder.
- `node --version` → `v22.19.0`; `npm --version` → `11.6.1`.
- `npm test` → **51 passed, 0 failed** (22 suites), with ESM/module-type warnings only.
- `node_modules/` absent → no build, lint, or dev-server run was possible.

