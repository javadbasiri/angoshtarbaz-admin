# Active Context

## Current focus (2026-11-23)

- Built the project **Memory Bank** under `memory-bank/`: `projectbrief.md`, `techContext.md`, `systemPatterns.md`, `progress.md`, plus this file and `productContext.md`.
- No application source files, configuration, or dependencies were modified while documenting.
- The bank is written against git HEAD `39d7c9e` on `main`; `memory-bank/` is the only untracked change.

## What was verified

- Read `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example`, `README.md`, `proxy.ts`, all `app/` routes/layouts, all components, all `lib/` modules, `types/`, and `scripts/mock-api.mjs`.
- Cross-checked the backend repo at `d:\Projects\angoshtarbaz\angoshtarbaz-backend`: `gallery.constants.ts` (images only, 10 MiB), `gallery.controller.ts` (no folder routes), `API.md`, and `package.json`.
- `git log` / `git status`: HEAD `39d7c9e`, clean except the untracked `memory-bank/` folder.
- Node `v22.19.0`, npm `11.6.1`.
- `npm test`: **51 tests / 22 suites / 51 pass / 0 fail**; only `MODULE_TYPELESS_PACKAGE_JSON` warnings.
- `node_modules/` is absent, so `next build`, `next dev`, and `eslint` were **not** verified.

## Immediate next actions

1. `npm install`, then `npm run lint` and `npm run build`; smoke-test the panel against the backend (`:3000`) or mock API (`:3002`).
2. Reconcile gallery limits/MIME with the backend (images only, 10 MiB vs the UI's 12 MB images / 50 MB MP4) and decide the video story.
3. Implement or confirm the ANG-A6 `/gallery/browse|tree|folders*|objects*` backend routes; keep `NEXT_PUBLIC_GALLERY_FOLDERS` off by default until they exist.
4. Add product deletion (`deleteProductAction` + confirmation UI) since the backend already supports it.
5. Add gallery pagination/load-more and replace the flat 100-asset cap.
6. Add `error.tsx` / `not-found.tsx` boundaries and wire CI (lint + build + test).
7. Harden the proxy's `/login?next=` redirect with the same same-origin validation the login form already uses.

## Decisions / constraints in effect

- **No admin BFF or Route Handlers.** Keep using Server Components + Server Actions; the JWT must stay server-side.
- **Prices: Toman in UI, integer IRR in payloads.** All conversion goes through `lib/format.ts`.
- **Persian/RTL UI.** New UI must use the existing tokens/classes, Vazirmatn, and Persian copy.
- **Sample content uses ۰.۸ carat, never 0.75.** Keep `lib/product-sample.ts` as the source of truth.
- **Folder gallery is additive and flagged.** Do not let it change flat ANG-A3 request bodies or default behaviour.
- **Tolerant parsers are intentional.** Extend them instead of assuming a single backend envelope.
- **Tests are dependency-free and registered manually.** Add new `lib/*.test.ts` files to the `test` script.

## Memory-bank maintenance

Update `progress.md` when features/gaps change, `activeContext.md` when focus or next actions change, and `techContext.md` / `systemPatterns.md` whenever the stack, routes, contracts, or architectural patterns change. Re-run the verification steps above after installing dependencies or changing the backend contract.
