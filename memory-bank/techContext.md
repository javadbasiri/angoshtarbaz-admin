# Tech Context — Angoshtarbaz Admin

> Snapshot: **2026-11-23** · Repo `d:\Projects\angoshtarbaz\angoshtarbaz-admin` · Branch `main` · HEAD `39d7c9e` (merge PR #9, 2026-10-24) · working tree clean except untracked `memory-bank/`

## 1. Project identity

| Item | Value |
| --- | --- |
| npm package | `angoshtarbaz-admin` v0.1.0 (private) |
| Product | Admin panel for **Angoshtarbaz / انگشترباز**, a Persian jewelry (ring) store |
| Role | Separate back-office frontend for **`angoshtarbaz-backend`** (NestJS API) |
| Entry points | `app/layout.tsx` (root), `app/(shell)/layout.tsx` (session), `proxy.ts` (request gate) |
| Dev/prod port | **3001** (`next dev -p 3001`, `next start -p 3001`) |
| Locale | Persian, `lang="fa"`, `dir="rtl"`, Vazirmatn |
| Money rule | UI **Toman** (Persian digits) ⇄ API integer **IRR** (`×10` / `÷10`) |
| Backend origin | `NEXT_PUBLIC_API_URL`, default `http://localhost:3000` |
| Runtime verified | Node **22.19.0**, npm **11.6.1** (Next 16 requires Node ≥ 20.9) |

## 2. Language & core runtime

### TypeScript
- **TypeScript ^5**, `strict: true`, `noEmit: true`, `isolatedModules: true`.
- `target: ES2017`; libs `dom`, `dom.iterable`, `esnext`; `module: esnext`; `moduleResolution: bundler`.
- `jsx: react-jsx`; `allowImportingTsExtensions: true` (tests import `./format.ts` explicitly).
- Path alias `@/*` → `./*` (repo root), plus the Next TypeScript plugin.
- Included: `next-env.d.ts`, all `.ts` / `.tsx`, generated `.next/types`, `**/*.mts`; excludes `node_modules`.

### React & Next.js
- **React 19.2.8**, **react-dom 19.2.8**.
- **Next.js 16.3.5** — **App Router only** with React Server Components, Server Actions and route groups.
- `next.config.ts` contains only:
  ```ts
  experimental: { proxyClientMaxBodySize: "64mb" }
  ```
  No image domains, rewrites, redirects, basePath, or custom webpack.
- Next 16 **`proxy.ts`** request interception (the successor of `middleware.ts`): exported `proxy(request)` + `config.matcher`. It gates pages on the presence of the session cookie.
- No `app/**/route.ts` Route Handlers and no `middleware.ts` — the previous admin BFF was removed in ANG-A5.
- Fonts: `next/font/google` **Vazirmatn** (`subsets: ["arabic", "latin"]`, `variable: "--font-vazirmatn"`, `display: "swap"`).
- Metadata: title «انگشترباز | پنل ادمین», description «پنل مدیریت فروشگاه انگشترباز».

## 3. Styling & design system

- **Tailwind CSS v4** + **`@tailwindcss/postcss` ^4** (PostCSS plugin in `postcss.config.mjs`).
- No `tailwind.config.*` — v4 CSS-first configuration. `app/globals.css` starts with `@import "tailwindcss"` and then imports the hand-written stylesheets:
  - `app/admin.css` (≈28.9 KB — shell, buttons, panels, forms, header/sidebar)
  - `app/gallery.css` (≈18.7 KB — flat media library, picker modal)
  - `app/gallery-folders.css` (≈15.1 KB — folder tree/layout)
  - `app/products.css` (≈13.0 KB — product list table/cards)
- Brand tokens are CSS custom properties on `:root` and exposed to Tailwind with `@theme inline` (`--color-primary`, `--color-canvas`, `--font-sans`, …). Components use semantic BEM-ish classes (`.btn--primary`, `.panel__head`, `.media-tile`) rather than utility soup.
- **No component library** (no shadcn/Radix/MUI/Chakra) and **no icon package**; icons are inline SVG React components (`components/admin/icons.tsx`, `components/gallery/folder-icons.tsx`).
- No CSS Modules, no styled-components, no SCSS.
- RTL by default; responsive drawer breakpoint is 960px; skeletons, empty states, alerts and toasts are hand-built CSS.

## 4. Authentication & session technology

- **Custom JWT auth** against Nest; no NextAuth/Auth.js, no Clerk, no refresh-token flow.
- Session cookie: `angoshtarbaz_admin_session`, **httpOnly**, `sameSite: "lax"`, `secure` in production, `path: "/"`, max-age **7 days** (`lib/auth-constants.ts`, `lib/session-cookie.ts`).
- `POST /auth/login` is called by a **Server Action** (`lib/auth-actions.ts`); the token is extracted from common Nest payloads and stored in the cookie. Non-admin roles are rejected (`403`).
- `GET /auth/profile` is loaded on every `(shell)` render (`lib/current-user.ts`) to populate the header user chip.
- `proxy.ts` redirects unauthenticated users to `/login?next=...`; authenticated GETs of `/login` bounce back, while POSTs and Server Actions (`next-action` header) are allowed through.

## 5. Data access & HTTP

- Native **`fetch`** wrapper (`lib/backend.ts`): absolute Nest URL, `Accept: application/json`, auto `Content-Type: application/json` for non-binary bodies, optional `Authorization: Bearer`, and **`cache: "no-store"`** on every call.
- No Axios, SWR, TanStack Query, tRPC, GraphQL, or WebSocket layer.
- `callAdminBackend` (`lib/admin-call.ts`) returns a discriminated union: `ok | http | unauthorized | offline`; 401 clears the cookie.
- Server Actions return `ActionResult<T>` (`{ ok: true, data }` or `{ ok: false, status, message, code?, objectCount? }`), converted to `ApiError` on the client by `unwrapAction`.
- Browser uploads use **`XMLHttpRequest`** (`lib/gallery-upload.ts`) only to expose upload progress; the admin JWT is never attached to the presigned PUT.
- All JSON parsing is defensive: envelope variants (`{ data }`, `{ data, meta }`, `{ product }`, bare arrays, `_id`) and missing meta are normalised in `lib/product-map.ts`, `lib/product-list.ts`, `lib/gallery.ts`, `lib/backend.ts`.

## 6. State management & forms

- **No global state library** (no Redux, Zustand, Jotai, MobX, Recoil).
- React **Context** for two concerns:
  - `CurrentUserProvider` — the admin identity for the header (server-provided user).
  - `AdminShellProvider` — sidebar open/close, Escape handling, body scroll lock.
- Local `useState` / `useEffect` / `useMemo` / `useCallback` inside client components; `useTransition` for router navigations.
- **URL query string is the source of truth** for product-list state (`status`, `search`, `page`, `limit`) and for the gallery folder path (`?prefix=`).
- **No form library** (no react-hook-form, Formik, zod): a custom `useProductForm` hook owns values, errors, alerts, toasts, upload state, validation and payload building.

## 7. Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Nest origin. Trailing slash trimmed; blank/whitespace falls back to default |
| `NEXT_PUBLIC_API_BASE_URL` | — | Legacy scaffold alias used only when `NEXT_PUBLIC_API_URL` is blank |
| `NEXT_PUBLIC_GALLERY_FOLDERS` | off | Enables the ANG-A6 folder gallery when trimmed value is `1` or `true` |
| `NEXT_PUBLIC_GALLERY_FOLDERS_STUB` | off | Uses the in-memory folder stub instead of Nest (only when folders are on) |
| `MOCK_API_PORT` | `3002` | Port for `scripts/mock-api.mjs` (mock server, not Next) |

All `NEXT_PUBLIC_*` values are **inlined at build time**; changing them requires restarting `next dev` or rebuilding. `.env*` files are git-ignored except `.env.example`.

## 8. Tooling & scripts

| Script | Command |
| --- | --- |
| `npm run dev` | `next dev -p 3001` |
| `npm run build` | `next build` |
| `npm run start` | `next start -p 3001` |
| `npm run lint` | `eslint` (ESLint 9 flat config) |
| `npm test` | `node --experimental-strip-types --test lib/format.test.ts lib/product-list.test.ts lib/admin-display.test.ts lib/gallery-upload-target.test.ts lib/gallery-payload.test.ts lib/login-response.test.ts lib/gallery-folders.test.ts` |
| `npm run mock-api` | `node scripts/mock-api.mjs` |

### Lint / formatting
- **ESLint 9 flat config** (`eslint.config.mjs`): `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`; ignores `.next`, `out`, `build`, `next-env.d.ts`.
- **No Prettier config in this repo.** Observed style is 2-space indentation, double quotes, semicolons, trailing commas, grouped imports.
- No CI workflow, no Dockerfile, no Husky/lint-staged, no commitlint.

## 9. Testing

- **Node.js built-in test runner** (`node:test` + `node:assert/strict`), running TypeScript directly with `--experimental-strip-types` (Node 22+). No Jest, Vitest, Playwright, or Testing Library.
- **7 test files / 22 suites / 51 tests**, verified green on Node 22.19.0:
  `format.test.ts`, `product-list.test.ts`, `admin-display.test.ts`, `gallery-upload-target.test.ts`, `gallery-payload.test.ts`, `login-response.test.ts`, `gallery-folders.test.ts`.
- The tests are dependency-free (no `node_modules` needed) because they only import pure `lib/*.ts` helpers.
- The test file list is hard-coded in the `test` script: a new test file must be added there.
- Runtime emits `MODULE_TYPELESS_PACKAGE_JSON` warnings because `package.json` has no `"type": "module"`; tests still pass.
- Test coverage focuses on pure logic only — no React components, no browser flows, no server actions.

## 10. Local infrastructure & companion tools

- Requires a running **NestJS `angoshtarbaz-backend`** at `NEXT_PUBLIC_API_URL` (default `:3000`). The backend owns PostgreSQL, JWT, gallery storage and CORS.
- Admin seed credentials documented in the README: `admin@angoshtarbaz.local` / `admin123456`.
- Optional **mock API** (`scripts/mock-api.mjs`, plain `node:http`, zero dependencies) on `:3002`; supports `POST /auth/login`, `GET /auth/profile`, `GET /collections`, `GET /products`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`, flat gallery (`POST /gallery/presign`, `PUT /gallery/upload/:key?token=`, `GET /gallery/files/:key`, `POST/GET /gallery`, `DELETE /gallery/:id`).
- Mock switches: `MOCK_PRODUCTS=empty` (empty-state), `MOCK_LATENCY_MS` (skeleton testing), `MOCK_API_PORT`.
- The mock API does **not** implement the ANG-A6 folder routes; folder UI offline review uses `NEXT_PUBLIC_GALLERY_FOLDERS_STUB=1`.

## 11. Integration contract notes (verified against the backend repo)

- Backend gallery accepts **images only** (`image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `image/avif`) with a **10 MiB** maximum (`GALLERY_ALLOWED_MIMES`, `GALLERY_MAX_BYTES`). The admin UI currently advertises JPG/PNG/WebP up to **12 MB** and **MP4 up to 50 MB**; video and >10 MiB files will be rejected by the real backend. Align these limits before relying on video.
- The backend gallery controller (snapshot) exposes only `POST /gallery/presign`, `PUT /gallery/upload/:key`, `GET /gallery/files/:key`, `POST /gallery`, `GET /gallery`, `GET /gallery/:id`, `DELETE /gallery/:id`. The ANG-A6 folder endpoints used by `lib/gallery-folder-actions.ts` are not present yet; keep `NEXT_PUBLIC_GALLERY_FOLDERS` off or use the stub until the backend adds them.
- The backend's `GET /gallery` returns a paginated `{ data, meta }` envelope; the admin list action requests `limit=100` and displays the first page only.
- Backend `price` is integer IRR; admin conversion is centralised in `lib/format.ts`.

