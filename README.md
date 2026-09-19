# انگشترباز — Admin

پنل ادمین فروشگاه انگشترباز (پروژه جدا از فروشگاه).

## Scope
- Admin shell (ANG-A0)
- Add Product (ANG-A1)

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- RTL (`lang="fa"` / `dir="rtl"`) + [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- Brand tokens: primary `#541926`, secondary `#E0E0E0`, canvas `#F8F4EC`

## Setup

```bash
npm i
cp .env.example .env.local
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

`NEXT_PUBLIC_API_BASE_URL` must point at **angoshtarbaz-backend** (see `.env.example`).

## Scripts

| Command | Description |
| --- | --- |
| `npm i` | Install dependencies |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Routes (scaffold)

| Path | Status |
| --- | --- |
| `/` | Redirects to `/login` |
| `/login` | Login stub |
| `/admin` | Admin shell (sidebar + dashboard placeholder) |
| `/admin/products/new` | Add Product form structure (name, slug, description, price, collection, status, sizes, specs, gallery) |

Auth, API wiring, and UI polish are intentionally out of scope for this bootstrap.
