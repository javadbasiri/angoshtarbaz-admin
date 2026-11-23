# System Patterns — Angoshtarbaz Admin

> Snapshot: **2026-11-23** · HEAD `39d7c9e` · Next.js 16 App Router admin frontend for the NestJS `angoshtarbaz-backend`

## 1. High-level architecture

Server-first Next.js application: pages render on the server, all privileged HTTP calls happen on the server, and the browser receives only HTML/RSC payloads plus public media URLs.

```
Browser
  → proxy.ts (cookie presence gate; /login redirects)
  → App Router
       ├── Server Component page (async)
       │     → loader (lib/*-load.ts / lib/current-user.ts)
       │     → backendFetch (lib/backend.ts)  ── Authorization: Bearer ──→ NestJS API
       │     → JSON normaliser (lib/*-map.ts / lib/*-list.ts / gallery.ts)
       │     → Client component (interaction, local state)
       └── Server Action ("use server")
             → callAdminBackend / backendFetch ── Bearer ──→ NestJS API
             → ActionResult<T> → ApiError on the client
  Browser (upload only)
  → PUT presigned uploadUrl (no admin JWT) → mock storage or S3
```

Core principles visible in the code:

1. **No admin BFF / Route Handlers.** Every Nest call is made from a Server Component render or a Server Action (ANG-A5).
2. **JWT never leaves the server.** The httpOnly cookie is read with `cookies()` inside `lib/backend.ts` / `lib/admin-call.ts`; browser code never receives it.
3. **Tolerant at the edges.** Response parsers accept several envelope shapes and missing metadata, then produce stable UI types.
4. **URL as state for list-like screens.** Product list filters/pagination and gallery folder prefixes live in the query string.
5. **Pure logic extracted for tests.** Formatting, path building, payload mapping, response parsing and the folder stub are dependency-free modules under `lib/`.

## 2. Directory structure & responsibilities

```
app/
├── layout.tsx                 root html/body, Vazirmatn, metadata, global CSS
├── globals.css                Tailwind v4 import + brand tokens + @theme inline
├── admin.css / products.css / gallery.css / gallery-folders.css
├── login/
│   ├── page.tsx               public login card (Suspense around the form)
│   └── login-form.tsx         client form → loginAction, safe `next` redirect
├── (shell)/                   authenticated area (no extra URL segment)
│   ├── layout.tsx             loadCurrentUser → CurrentUserProvider or ExpireSession
│   ├── page.tsx               `/` shell reference dashboard
│   ├── dashboard/page.tsx     redirect → `/`
│   ├── products/
│   │   ├── (list)/            `/products` (route group for loading.tsx)
│   │   │   ├── page.tsx       parse query → loadProductList → ProductList
│   │   │   └── loading.tsx    ProductListSkeleton inside AdminShell
│   │   ├── new/page.tsx       `/products/new` → ProductForm (prefill `?sample=1`)
│   │   └── [id]/edit/page.tsx `/products/[id]/edit` → loadProductForEdit → ProductEditor
│   └── gallery/page.tsx       `/gallery` → flat or folder library by env flag
└── admin/                     compatibility aliases → redirect to canonical routes
    ├── page.tsx               → `/`
    ├── gallery, media         → `/gallery`
    └── products, products/new,
        products/[id]/edit     → `/products…` (query preserved for the list)

components/
├── admin/      shell, shell context, header, sidebar, icons, current-user
├── gallery/    flat library, picker modal, folder library/tree/dialogs/icons, media thumb
└── product/    form, form fields, editor, list, skeletons, useProductForm, expire-session

lib/
├── *-actions.ts        "use server" mutations + client-initiated Nest reads
├── *-load.ts           server-only loaders used by RSC pages
├── *-map.ts / *.ts     normalisers, payload builders, pure helpers, stub engine
├── backend.ts          fetch wrapper, envelope helpers, token extraction
├── admin-call.ts       authorized call union + ActionResult bridge
├── env.ts              API URL/feature flags + auth paths
├── format.ts           Persian digits, Toman⇄IRR, slugify
├── auth-constants.ts / session-cookie.ts / current-user.ts / expire-session.ts
├── session-expired.ts / redirect-error.ts / call-action.ts / api.ts / action-result.ts
└── *.test.ts           Node test-runner tests colocated with the helpers

types/        shared domain types (product, auth, collection, gallery, gallery-folders)
scripts/      mock-api.mjs — dependency-free local Nest substitute (:3002)
```

Naming convention: kebab-case files; `PascalCase` components; `use*` hooks; `<domain>-actions.ts` for Server Actions; `*-load.ts` for RSC loaders; `*.test.ts` next to the unit under test.

## 3. Routing & rendering composition

### Route map

| Path | Rendering | Notes |
| --- | --- | --- |
| `/login` | Server page + client form | Public; `proxy.ts` bounces authenticated document GETs |
| `/` | Server page | Shell reference dashboard with quick links |
| `/dashboard` | Server redirect | → `/` |
| `/products` | Server page (async, query-driven) | `(list)` route group supplies `loading.tsx`; client `ProductList` |
| `/products/new` | Server page + client form | Optional `?sample=1` fills the official sample |
| `/products/[id]/edit` | Server page + client editor | Loads product+collections on the server for first paint |
| `/gallery` | Server page + client library | Folder UI only when `env.galleryFolders`; Suspense skeleton |
| `/admin/*` | Server redirects | Backwards-compatible aliases; list query string preserved |
| `/admin/media` | Server redirect | → `/gallery` |

### Layout composition

- **Root layout** sets `<html lang="fa" dir="rtl">`, Vazirmatn CSS variable, `bg-canvas`, metadata.
- **`(shell)/layout.tsx` does not render chrome.** It only loads the current user and wraps children in `CurrentUserProvider`; if the profile call returns 401 it renders `ExpireSession` (cookie clear + client redirect).
- **`AdminShell` is applied per page**, not in a layout: each page wraps its content in `<AdminShell title … breadcrumb …>`. The shell is a client component that nests `AdminShellProvider` → backdrop + sidebar + `<main>` with the page header.
- `ProductEditor` renders its **own** `AdminShell` once it has data (the server page only wraps the unauthorized skeleton). This is the one page whose chrome is owned by a client component rather than the page.
- Route groups keep URL paths clean: `(shell)` and `products/(list)` are organisational only.

### Request proxy (`proxy.ts`)

- Matcher covers everything except `_next/static`, `_next/image`, `favicon.ico`, and common image extensions.
- `PUBLIC_PATHS = { "/login" }`.
- No session cookie + non-public path → `307` to `/login?next=<pathname>`.
- Session cookie + document GET `/login` → redirect to `next || "/"`. Note: the **proxy does not validate** `next`, while the login form does (`/...`, not `//...`) — a same-origin check in the proxy is a pending hardening item.
- POSTs and requests carrying `next-action` bypass the login bounce so a stale login tab can still submit a Server Action.
- The proxy only checks **presence**; token validity is established later by `GET /auth/profile` on the shell render.

### Loading / streaming

- `Suspense` is used on `/gallery` with `GalleryFoldersSkeleton` for the folder implementation.
- `products/(list)/loading.tsx` streams `ProductListSkeleton` while the server page resolves.
- Additional skeletons: `ProductFormSkeleton` (add/edit), `GallerySkeleton` (flat gallery), inline skeleton markup inside `ProductList` for filter transitions (`useTransition` pending).

## 4. Server-first data flow

### Two entry points into the backend

| Mechanism | Used for | Examples |
| --- | --- | --- |
| **RSC loader** (direct `backendFetch`) | Initial page data that is needed for first paint | `loadCurrentUser`, `loadProductList`, `loadProductForEdit` |
| **Server Action** (`"use server"`) | Mutations and client-initiated reads after hydration | `loginAction`, `createProductAction`, `updateProductAction`, `getProductAction`, `loadCollectionsAction`, `listGalleryAction`, `presignGalleryAction`, `registerGalleryAction`, `deleteGalleryAction`, folder actions |

Why both: RSC loaders cannot write cookies or be called from client event handlers, while Server Actions can do both and keep the JWT server-side. Pages that need request-time data are dynamic because `backendFetch` forces `cache: "no-store"`.

### Layering

```
lib/backend.ts
  backendFetch(path, init, token)          → { response, body }   (never throws on HTTP status)
  backendFetchOrThrow<T>()                 → throws ApiError on !ok
  getSessionToken()                        → reads httpOnly cookie
  extractUser / extractCollections / extractId / extractCreatedProduct / messageFromBody

lib/admin-call.ts
  callAdminBackend(path, init)             → { kind: ok | http | unauthorized | offline }
  adminCallToResult(call, onOk, fallback)  → ActionResult<T>

lib/*-actions.ts
  validate input → callAdminBackend → parse body → actionOk/actionFail

lib/*-load.ts
  token check → backendFetch → 401/404/error states → typed load state
```

- `ActionResult` (`lib/action-result.ts`) is the client-facing contract for every Server Action; optional `code` and `objectCount` support folder-conflict dialogs.
- `unwrapAction` (`lib/call-action.ts`) converts a failed action into `ApiError` and fires the session-expired event on 401.
- `ApiError` (`lib/api.ts`) carries `status` and optional `details`; UI code maps it to Persian alert/toast copy.

## 5. Authentication & session pattern

1. `/login` renders a client form pre-filled with the seed credentials (`admin@angoshtarbaz.local` / `admin123456`).
2. `loginAction` validates non-empty input, calls `POST /auth/login` **without** a token, and:
   - extracts the JWT with `extractToken` (Nest `access_token`, `accessToken`, `token`, nested `data`/`tokens`),
   - extracts the user with `extractUser`, requires `role === "admin"` (case-insensitive),
   - sets the httpOnly cookie (`setSessionCookie`), returns `ActionResult<AdminUser>`.
   - Login failures get diagnostics from `lib/login-response.ts` (HTML self-call detection, origin comparison, redacted body preview) instead of leaking raw responses.
3. The client pushes to a **safe** `next` path (`/...`, not `//...`) and refreshes.
4. `(shell)/layout.tsx` calls `loadCurrentUser` → `GET /auth/profile`:
   - no token → `anonymous` (proxy normally prevents this),
   - `401` → `unauthorized` → render `ExpireSession`,
   - other failure/offline → `ready` with `user: null` (header falls back to «ادمین فروشگاه»),
   - success → `ready` with `AdminUser`.
5. **Session expiry is event-driven.** Any 401 in a Server Action path calls `signalSessionExpired()` (a `window` custom event). `CurrentUserProvider` listens, calls the `expireAdminSession` Server Action (clears the cookie), then `window.location.replace("/login")`. `ExpireSession` does the same for a server-detected 401.
6. **Logout**: `logoutAction` clears the cookie and `redirect("/login")`; the header catches the Next redirect error with `rethrowNextRedirect` so it is not shown as a failure.
7. **Cookie writes only happen in Server Actions**, never during a render (`loadCurrentUser` deliberately does not clear the cookie on 401).

## 6. State-management patterns

| Kind of state | Mechanism | Examples |
| --- | --- | --- |
| Server identity | React Context fed by a Server Component | `CurrentUserProvider` → `useAdminDisplayName` |
| Shell UI state | React Context | `AdminShellProvider` (`sidebarOpen`, toggle, Escape, scroll lock) |
| List/filter state | URL query string + `useRouter` + `useTransition` | `ProductList` (`?status=&search=&page=&limit=`) |
| Folder location | URL query string | `/gallery?prefix=gallery/rings/red/` |
| Form state | `useState` inside `useProductForm` | values, errors, alert, toast, submitting, collections |
| Upload state | local component state | `uploads: UploadTile[]` in gallery components |
| Modal/selection state | local component state | gallery picker `selectedIds`, list `selected` |
| Ephemeral feedback | `alert`/`toast` state with a 4s timer | success/error banners, «فایل حذف شد» |

- **No optimistic server mutations.** Writes await the Server Action, then update local state or re-render through router navigation.
- `ProductList` debounces search by **300 ms**, uses `router.replace(..., { scroll: false })` for typing and `router.push` for explicit filter/page changes, and shows a skeleton while `isPending`.
- A `lastSearch` ref prevents the debounce effect from fighting URL-driven updates.

## 7. Product domain pattern

### Types and form shape

- `types/product.ts` separates:
  - `ProductFormValues` — UI shape: Toman **string** with Persian digits, sizes as **strings**, gallery as `GalleryImage[]` (local `File`, blob preview, optional `remoteId`).
  - `CreateProductRequest` / `PatchProductRequest` — API shape: integer IRR `price`, numeric `sizes`, `specs`, `imageIds[]`, optional `urls[]`, `stock`.
  - `ProductRecord` — full record returned by `GET /products/:id`.
  - `ProductEditLoadState` — `loading | unauthorized | not-found | error | ready`.
- `lib/product-map.ts` is the single boundary:
  - `extractProduct(body)` normalises `{ data }`, `{ product }`, flat records, `_id`, collection objects, `images[]`/`gallery[]`.
  - `productToFormValues(record)` converts IRR → Toman display, filters sizes to `RING_SIZE_OPTIONS`, builds gallery rows.
  - `galleryFromProduct` pairs `urls[]` with `imageIds[]` by index.
  - `formValuesToPayload(values, status, gallery)` parses Toman, multiplies by 10, trims fields, omits empty slug/urls, includes numeric stock.
  - `withProductCollection` injects the product's collection when `GET /collections` does not return it.

### Shared hook: `useProductForm`

Reused by both add (`ProductForm`) and edit (`ProductEditor`) so behaviour cannot drift:

- initial values supplied by `emptyProductFormValues`, `sampleProductFormValues()`, or `productToFormValues(product)`;
- loads collections via `loadCollectionsAction` (unless the edit page already supplied them), falls back to `FALLBACK_COLLECTIONS` (سولیتر / وینتیج / طلای سفید);
- hydrates gallery URLs for existing `remoteId`s by calling `listGalleryAction(100)` and mapping ids → `publicUrl/filename/kind`;
- name change auto-generates the slug until the admin manually edits it (`slugManual`);
- `formatTomanInput` keeps Persian grouping while typing; `parseTomanInput` accepts Persian/Arabic digits and separators;
- validation rules: name required, price must be a positive parseable Toman amount, collection required;
- `addFiles` creates blob previews for local images, `moveImage`/`removeImage` maintain order and revoke object URLs;
- `applyGallerySelection(assets)` replaces the remote portion of the gallery while preserving local files;
- `buildPayload(status)` validates, uploads local files through `uploadFileToGallery`, then maps to the API payload;
- exposes `submitting` (`"draft" | "published" | "save" | null`), `alert`, `toast`, `bootstrapping`.

### Create flow (`ProductForm`)

`checkValidity` → `buildPayload` → `createProductAction` → optional `getProductAction(id)` confirmation → success alert + toast; the page stays open. Status can be `draft` or `published` from the action buttons, and the form also has a status radio group. `?sample=1` fills the official 0.8-carat sample.

### Edit flow (`ProductEditor`)

Server page loads the product + collections for first paint. The client editor keeps a `ProductEditLoadState`, supports reload (retry) via `getProductAction` + `loadCollectionsAction`, and renders:
- skeleton while loading,
- not-found card with the route/id and back/add links,
- error card with retry,
- ready form with `PATCH`, an «در حال ذخیره» info banner, draft and primary save buttons, breadcrumb from collection → product → «ویرایش».

### Product formatting and display

- `formatIrrAsToman` → Persian grouped Toman (`۱۲۸٬۰۰۰٬۰۰۰ تومان`).
- `productDisplayName` falls back name → title → slug → id; `productSubline` shows title only when distinct.
- `productThumbSrc` prefers `thumbnail` then `imageUrl`; failures fall back to an inline ring glyph.
- `buildPreviewMeta` produces the storefront-style card subline and special-cases the 0.8-carat sample.

## 8. Gallery patterns

### Flat library (ANG-A3, default)

Pipeline (`lib/gallery-upload.ts`):

1. Validate the file client-side (`isAllowedGalleryFile`): JPG/PNG/WebP ≤ 12 MB, MP4 ≤ 50 MB (UI limits; see the backend mismatch in `techContext.md`).
2. `presignGalleryAction({ filename, contentType, size })` → Server Action → `POST /gallery/presign` with `{ filename, mime, size }` (no `kind`).
3. `browserUploadTarget` resolves the URL against the Nest origin, strips `Authorization`/`Host` headers, keeps the mock `?token=` or S3 signature.
4. Browser `PUT`s bytes with `XMLHttpRequest` (progress), **without** the admin JWT.
5. `registerGalleryAction({ key, publicUrl, filename, mimeType, size })` → `POST /gallery` with `{ url, key, mime, size, originalName }` → returns `id`.
6. UI inserts the new asset at the top of the grid; product forms attach `imageIds[]`.

UI (`components/gallery/gallery-library.tsx`):

- loads the first 100 assets via `listGalleryAction(100)`;
- drag-and-drop or file-picker multi-upload, per-tile progress, retry, dismiss;
- selection mode with select-all/clear and batch delete (sequential `DELETE /gallery/:id`, partial-failure banner);
- empty dropzone, compact dropzone when populated, skeleton, error banner, toast;
- media thumbs use `<img>`/`<video>` or deterministic placeholder classes; video gets a badge.

### Product picker modal (`gallery-picker-modal.tsx`)

- Loads the flat library, filters all/images/videos;
- multi-select with explicit ordering (selected strip, move left/right, remove);
- "first image = card image" hint; confirms with `GalleryAsset[]`, which `useProductForm.applyGallerySelection` converts to `GalleryImage[]` (`remoteId` preserved so re-opening the modal preselects).

### Folder library (ANG-A6, flagged)

Selected in `app/(shell)/gallery/page.tsx` by `env.galleryFolders` (build-time flag, default off) and rendered under `Suspense`.

Data source abstraction (`types/gallery-folders.ts`):

```ts
GalleryFoldersClient {
  browse, tree?, createFolder, renameFolder, deleteFolder,
  moveObjects, presign, register, deleteObject, deleteObjects
}
```

Two implementations:

- **Nest adapter** (`lib/gallery-folders-nest.ts` + `lib/gallery-folder-actions.ts`): each method calls a Server Action (`browseGalleryAction`, `galleryFolderTreeAction`, `createGalleryFolderAction`, `renameGalleryFolderAction`, `deleteGalleryFolderAction`, `moveGalleryObjectsAction`, `presignGalleryFolderAction`), which calls Nest with the cookie JWT. Errors become `GalleryFoldersError` with `FOLDER_EXISTS`, `FOLDER_NOT_EMPTY`, `OBJECT_EXISTS`, `NOT_FOUND`, `VALIDATION`.
- **In-memory stub** (`createGalleryFoldersStub()` in `lib/gallery-folders.ts`): seeds `gallery/rings/red/`, `gallery/rings/engagement/`, `gallery/products/solitaire/`, `gallery/archive/`; implements browse/create/rename/delete/move/presign/register/delete with the same rules, including `.keep` markers for empty folders. Enabled only by `NEXT_PUBLIC_GALLERY_FOLDERS_STUB=1`.

Prefix model:

- root is `gallery/`; folders are key prefixes; empty folders are represented by a zero-byte `{prefix}.keep` marker that browse hides;
- upload always targets the current prefix; final key = prefix + sanitised filename;
- navigation is `?prefix=<encoded prefix>`; `resolveGalleryPrefix` defaults to root, and the stub demo opens `gallery/rings/red/` when no prefix is supplied;
- tree prefers `GET /gallery/tree`; on 404/405/501 or an unknown body it rebuilds the tree by recursively walking `browse`;
- delete checks emptiness first (`delete-blocked` dialog with object count), rename adjusts the current prefix, move supports `replace` / `autoRename` / `skip` with conflict UI;
- all dialogs (`folder-dialogs.tsx`) are custom modal components with focus management (`useDialogFocus`) and Persian copy.

### Feature-flag pattern

- `env.galleryFolders` and `env.galleryFoldersStub` are resolved once from `NEXT_PUBLIC_*` values (`1`/`true` after trim).
- The flat gallery remains the production default; the folder UI is additive and does not change flat contracts (`POST /gallery/presign` body stays `{ filename, mime, size }` when folders are off).

## 9. Normalisation & formatting pattern

- Every backend response goes through a parser that accepts:
  - bare arrays, `{ data: [] }`, `{ products/items/results: [] }`, nested `{ data: { products: [] } }`;
  - meta in `meta`, `pagination`, or `data.meta`; page/limit/total/pages aliases (`perPage`, `pageSize`, `currentPage`, `count`, `totalCount`, `pages`);
  - records with `id`/`_id`, `name`/`title`, `price`/`priceIrr`/`priceIRR`, `image`/`imageUrl`/`url`, `thumbnail`/`thumbUrl`, collection object/string.
- Missing meta is reconstructed: total inferred when the page is short, `totalPages` computed, `hasNext` from page/totalPages or page length.
- Persian formatting is centralised: `toEnglishDigits`, `toPersianDigits`, `parseTomanInput`, `formatTomanDisplay`, `formatIrrAsToman`, `formatTomanInput`, `formatFileSize`, `formatGalleryCount`, `slugifyName`.
- Fallbacks keep the UI usable: `FALLBACK_COLLECTIONS` when `/collections` is empty/offline; inline ring glyphs when thumbnails fail; `«ادمین فروشگاه»` when profile data is missing.
- Login diagnostics (`lib/login-response.ts`) detect when `NEXT_PUBLIC_API_URL` accidentally points at the admin itself, redact JWTs/passwords from previews, and surface actionable Persian messages.

## 10. UI composition & styling patterns

### Shell and navigation

- `AdminShell` (client) composes: `AdminShellProvider` → `.admin` grid → `Backdrop` + `AdminSidebar` + `.admin-main` (`AdminHeader` + `<main className="admin-content">`).
- `AdminShellProvider` owns `sidebarOpen`, closes on Escape, locks `body.overflow`, and exposes `toggleSidebar`.
- `AdminSidebar` renders `ADMIN_NAV` split into «فروشگاه» and «سیستم» sections. Items without `href` or with `soon: true` render as disabled «به‌زودی» placeholders (orders/settings).
- Active-state logic lives in `lib/nav.ts` (`navItemIsActive`), covering canonical and legacy alias paths; the sidebar uses `usePathname`.
- `AdminHeader` shows breadcrumb or eyebrow + title, a user chip (`useAdminDisplayName`), and a dropdown with logout. It closes on outside mousedown.
- Responsive: under 960px the sidebar becomes a drawer with a backdrop; content switches from tables to cards where applicable.

### Visual system

- Tokens in `:root` + `@theme inline`; most components use custom semantic classes from `app/*.css`. Tailwind provides the reset/import and token bridge, not the bulk of styling.
- Icons are inline SVGs (`MenuIcon`, `PlusIcon`, `TrashIcon`, `GalleryIcon`, `UploadIcon`, `SearchIcon`, `AlertIcon`, `CheckIcon`, `CloseIcon`, ring/person/play placeholders, folder glyphs).
- Layout primitives: `.panel`, `.panel__head/__body`, `.page-actions`, `.field`, `.input`, `.textarea`, `.btn` variants (`primary`, `secondary`, `ghost`, `danger`, `sm`), `.alert`, `.toast`, `.sk` skeletons, `.empty-state`, `.status-badge`, `.price`, `.pcard`, `.ptable`, `.media-grid`, `.folder-*`.
- Persian digits are applied at render time with `toPersianDigits`; prices use `formatIrrAsToman`; file sizes use `formatFileSize`.

### Feedback & accessibility patterns

- Standard feedback surfaces: inline field errors (`aria-invalid` + `aria-describedby`), top alert banners (`role="alert"` for errors, `role="status"` for success/info), 4-second success toasts with close buttons, per-tile upload progress (`role="progressbar"`).
- Loading: full skeletons for first paint, compact skeletons during transitions, `aria-busy` and `sr-only` status text.
- Empty states explain the next action and link to it (add product, upload media).
- Modals set `role="dialog"`, `aria-modal`, labelled title, Escape to close, body scroll lock, and focus management.
- Forms use real labels, `required` where applicable, semantic `radiogroup`/`checkbox` roles for custom controls, and `aria-expanded`/`aria-controls` on the sidebar toggle.
- RTL is handled globally; inputs that must remain Latin (email, slug, ids, routes) set `dir="ltr"`.

## 11. Error-handling pattern

| Situation | Detection | UI / behaviour |
| --- | --- | --- |
| No session cookie | `proxy.ts` | `307` to `/login?next=…` |
| Profile 401 | `loadCurrentUser` | `ExpireSession` → clear cookie → `/login` |
| Action 401 | `callAdminBackend` / `unwrapAction` | Clear cookie, dispatch session-expired event, abort handling |
| Product 404 | `loadProductForEdit`, `getProductAction`, `updateProductAction` | Not-found card («محصول یافت نشد») or `404` action message |
| Backend offline | `fetch` throw → `callAdminBackend` `offline` | Persian «اتصال به بک‌اند برقرار نشد.» / retry |
| Non-2xx backend | `callAdminBackend` `http` | Map `message` from body, fallback copy; `ActionResult.status` preserved |
| Malformed payload | Parsers return `null`/empty | `502` «پاسخ … ناقص است.» or graceful empty list |
| List load failure | `loadProductList` `error` | In-panel error card + «تلاش مجدد» (`router.refresh`) |
| Folder conflict | Nest `409` + code | Dialog-specific Persian copy and `objectCount` |
| Upload failure | XHR non-2xx / network | Per-tile error + «تلاش مجدد», batch banner for rejected files |
| Form validation | `useProductForm.validate` | Field errors + summary alert; no request sent |

- There are **no `error.tsx` / `not-found.tsx` / `global-error.tsx` files**; every screen models its own states (skeleton / unauthorized / not-found / error / ready).
- All user-facing messages are Persian; technical details (routes, ids, API origin) are shown in `<code dir="ltr">` where useful for debugging.
- Errors never include the JWT or password (login diagnostics redact them).

## 12. Testing pattern

- Pure functions are the test seam. Each `lib/*.test.ts` imports implementation with an explicit `.ts` extension and uses `node:test` + `assert/strict`.
- Covered areas:
  - `format.test.ts` — IRR→Toman conversion, grouping, zero/non-finite values.
  - `product-list.test.ts` — query parsing/clamping, browser href vs API path, tolerant list/meta extraction.
  - `admin-display.test.ts` — display-name fallbacks.
  - `gallery-upload-target.test.ts` — absolute upload URL resolution, mock token retention, Authorization stripping, S3 host preservation.
  - `gallery-payload.test.ts` — exact presign/register bodies, asset/presign parsing.
  - `login-response.test.ts` — token extraction variants, secret redaction, self-call diagnostics, unreachable backend copy.
  - `gallery-folders.test.ts` — env flag parsing, Nest path builders, stub browse/create/rename/delete/move/presign/keep semantics, breadcrumbs, prefix resolution, Nest parsers, nested-file exclusion.
- No mocking framework, no jsdom, no network; tests run without installing dependencies.
- Component/server-action behaviour is not tested; correctness there relies on typed contracts and manual verification against the mock API/backend.

## 13. Conventions summary

| Concern | Convention |
| --- | --- |
| Files | kebab-case (`product-form-fields.tsx`, `gallery-folder-actions.ts`) |
| Components | PascalCase named exports (`ProductEditor`, `GalleryPickerModal`) |
| Hooks | `useProductForm`, `useAdminShell`, `useAdminDisplayName` |
| Server Actions | `lib/<domain>-actions.ts` with `"use server"` at the top |
| RSC loaders | `lib/<domain>-load.ts` (no `"use server"`) |
| Pure helpers | descriptive verbs (`extractProduct`, `productListHref`, `tomanToIrr`) |
| Types | `types/<domain>.ts`; discriminated unions for load states |
| Styling | BEM-ish class names and CSS variables in `app/*.css` |
| Copy | Persian UI strings, English identifiers/comments |
| Formatting | 2-space indent, double quotes, semicolons, trailing commas |
| Errors | `ActionResult` for actions, `ApiError` on the client, Persian messages |

## 14. How to extend safely

**Add a new admin page**
1. Create `app/(shell)/<route>/page.tsx` (server) and wrap content in `AdminShell`.
2. Add a nav entry to `ADMIN_NAV` (`lib/nav.ts`) and extend `navItemIsActive` if it has aliases.
3. If it needs initial backend data, add a `lib/<domain>-load.ts` using `getSessionToken` + `backendFetch` and a discriminated load state.
4. Add a `loading.tsx` in a route group when a skeleton is useful.

**Add a mutation**
1. Add `lib/<domain>-actions.ts` with `"use server"`, use `callAdminBackend` + `adminCallToResult`, return `ActionResult<T>`.
2. On the client, call `unwrapAction` so 401s trigger the session-expired event and failures become `ApiError`.
3. Keep the JWT server-side; never add an `app/api` Route Handler for it.

**Add backend response handling**
1. Extend the relevant parser (`product-map`, `product-list`, `gallery`, `backend`) to accept the new shape without breaking existing ones.
2. Add a unit test to the matching `lib/*.test.ts` and register the file in the `test` script if it is new.

**Add a feature flag**
1. Add a `NEXT_PUBLIC_*` value to `.env.example` and `lib/env.ts` using `galleryFoldersEnabled`-style parsing.
2. Document that it is build-time inlined; default the new UI off until the backend contract is available.


