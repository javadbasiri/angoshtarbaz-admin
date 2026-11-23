# Product Context — Angoshtarbaz Admin

## Who uses this panel

| Actor | Goals | Access |
| --- | --- | --- |
| Shop administrator (operator) | Log in, curate the ring catalog, publish/draft products, manage the shared media library | Nest admin account (`role: admin`) via JWT |
| Content/photo operator | Upload and organise jewelry photos/videos, reuse them across products, keep the first image as the card image | Same admin session |
| Developer / reviewer | Run the panel against the real Nest API or the dependency-free mock API, inspect loading/error/empty states | Local dev on `:3001` |

Customers and the public storefront do **not** use this app; they use the separate storefront frontend.

## Primary journeys

1. **Sign in** — `/login` with `admin@angoshtarbaz.local` / `admin123456`; the cookie is httpOnly and a non-admin role is rejected.
2. **Orient** — land on `/` (shell reference), use the sidebar for محصولات and رسانه / گالری; سفارشات/تنظیمات are visibly «به‌زودی».
3. **Browse the catalog** — `/products`: search by name/slug/id, filter all/published/draft with counts, paginate; the URL carries the state.
4. **Create a ring** — `/products/new`: enter name, optional slug, description, Toman price, collection, stock, status, sizes, jewelry specs; attach photos from the central gallery or upload new ones; watch the live card preview; save draft or publish.
5. **Edit a ring** — open a row/card → `/products/[id]/edit`: server-prefilled form, save draft or save changes, see loading/not-found/error/saving/success states.
6. **Manage media** — `/gallery`: drag/drop or pick multiple files, watch progress, retry failures, select and delete assets.
7. **Reuse media** — in either product form, «انتخاب از گالری» opens a multi-select modal with explicit ordering; the first asset becomes the card image.
8. **Organise media (flag)** — with `NEXT_PUBLIC_GALLERY_FOLDERS=1`, browse a folder tree at `/gallery?prefix=…`, create/rename/delete empty folders, move files with conflict handling, upload into the current folder.
9. **Recover from expiry** — any 401 clears the cookie and returns to `/login`, preserving the attempted path via `next` where possible.

## Product decisions worth preserving

- **Back-office, not storefront.** No cart, checkout, customer account, or public product pages here.
- **Server-owned session.** The JWT lives only in an httpOnly cookie; browser JS never sees it. Privileged reads/writes happen in RSC/Server Actions, and only uploaded bytes go directly to storage.
- **Toman for humans, IRR for machines.** Admins type and read Toman; every API payload is integer IRR (`×10`/`÷10` in `lib/format.ts`).
- **Draft-first safety.** Products can be saved as drafts; publishing is an explicit choice.
- **Central media, not per-product uploads.** Gallery assets are reusable records referenced by `imageIds[]`; ordering matters because the first image is the card image.
- **Persian-first experience.** RTL layout, Vazirmatn, Persian digits and copy, while ids/slugs/routes stay Latin and LTR.
- **Explicit states over spinners.** Skeletons for first paint, banners/toasts for outcomes, dedicated not-found/error cards, retry paths.
- **Tolerant integration.** Parsers accept several backend envelope shapes so the UI degrades gracefully instead of crashing.
- **Feature-flag additive work.** The folder gallery is opt-in and must not alter the flat ANG-A3 contracts.

## Experience requirements

- Consistent shell on every authenticated screen (sidebar, header, breadcrumbs, user chip, logout).
- Mobile usable: drawer navigation under 960px, cards instead of tables on narrow widths.
- Accessible interactions: labelled fields, ARIA roles for custom radios/tabs/dialogs, Escape/backdrop close, focus handling, live-region feedback.
- Persian validation and error messages that say what to do next; technical ids/routes shown in LTR code style for debugging.
- Deterministic sample content for demos: ۰.۸ قیراط, ۱۲۸٬۰۰۰٬۰۰۰ تومان, «انگشتر سولیتر الماس», `solitaire-diamond-ring`.
- Brand fidelity to the ANG-A0…A6 mockups: burgundy primary, cream canvas, white surfaces, restrained borders.

## Product constraints / open questions

- **Orders and settings** are not designed yet; only navigation placeholders exist.
- **Video support** is shown in the UI but not accepted by the current backend gallery contract — decide whether to implement video or remove the affordance.
- **Folder organisation** is UI-complete but depends on backend endpoints that are not present yet.
- **Product deletion** is a backend capability without a UI; decide whether destructive actions belong in the list, the edit page, or both.
- **Large libraries** will exceed the flat 100-asset window; pagination/search for media is a product decision still open.
