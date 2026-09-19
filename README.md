# انگشترباز — Admin

پنل ادمین فروشگاه انگشترباز (مستقل از فروشگاه). RTL فارسی، Vazirmatn، و توکن‌های برند mockupهای ANG-A0 / ANG-A1 / ANG-A2.

## Scope

- **ANG-A0** — پوسته ادمین: سایدبار + هدر چسبان + محتوا، برند «انگشترباز» + بج ادمین، ناوبری محصولات (فعال) و سفارشات/تنظیمات به‌زودی. در عرض کمتر از ۹۶۰px کشوی همبرگر +backdrop.
- **ANG-A1** — افزودن محصول: فرم کامل، پیش‌نمایش کارت زنده، اعتبارسنجی، اسکلتون، بنر/توست موفقیت، اتصال به API.
- **ANG-A2** — ویرایش محصول: `GET /products/:id` برای پر کردن فرم، `PATCH` برای ذخیره، اسکلتون / یافت‌نشد / خطا با تلاش مجدد / ذخیره / اعتبارسنجی / بنر موفقیت. قیمت UI تومان است و API ریال (÷۱۰ نمایش، ×۱۰ ذخیره).
- احراز هویت JWT ادمین با کوکی **httpOnly**.
- خارج از محدوده: فروشگاه، سفارشات/تنظیمات واقعی، فهرست محصولات، دیپلوی.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `lang="fa"` / `dir="rtl"` + [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- برند: Primary `#541926` · Strong `#3F121C` · Secondary `#E0E0E0` · Canvas `#F8F4EC` · Surface `#FFFFFF` · Ink `#1C1917` · Muted `#78716C` · Border `#E7E0D4`

## Setup

```bash
npm i
cp .env.example .env.local
npm run dev
```

ادمین: [http://localhost:3000](http://localhost:3000)

بک‌اند باید روی پورت پیش‌فرض `3001` باشد (`NEXT_PUBLIC_API_URL`). اگر [angoshtarbaz-backend](https://github.com/javadbasiri/angoshtarbaz-backend) (ایجاد محصول + ویرایش) در دسترس نیست، API ساختگی محلی را اجرا کنید:

```bash
npm run mock-api
# http://localhost:3001  — login / collections / products (GET عمومی، PATCH ادمین)
# نمونه: GET /products/prd_solitaire_01
```

سپس در ترمینال دیگر `npm run dev`.

### CORS

بک‌اند `ADMIN_ORIGIN` را پیش‌فرض `http://localhost:3001` می‌گذارد. این پنل روی **۳۰۰۰** اجرا می‌شود؛ برای توسعه محلی یکی از این‌ها را روی بک‌اند ست کنید:

```bash
ADMIN_ORIGIN=http://localhost:3000
```

یا در محیط محلی بدون env، بک‌اند Origin را reflect می‌کند.

## Seed

| | |
| --- | --- |
| ایمیل | `admin@angoshtarbaz.local` |
| رمز | `admin123456` |
| نقش | `admin` (JWT) |

ورود از `/login` به `POST {API}/auth/login` پروکسی می‌شود و توکن در کوکی httpOnly `angoshtarbaz_admin_session` ذخیره می‌گردد. مسیرهای ادمین بدون نشست به `/login` می‌روند.

## Routes

| Path | |
| --- | --- |
| `/login` | ورود JWT |
| `/` و `/dashboard` | داشبورد / placeholder داخل پوسته |
| `/products/new` | افزودن محصول (ANG-A1) |
| `/products/[id]/edit` | ویرایش محصول (ANG-A2) |
| `/admin` و `/admin/products/new` | redirect به مسیرهای بالا (سازگاری اسکلت) |
| `/admin/products/[id]/edit` | redirect به `/products/[id]/edit` |

## API mapping

پنل مرورگر را مستقیم به بک‌اند وصل نمی‌کند؛ درخواست‌ها از BFF همین اپ (`/api/*`) با هدر `Authorization: Bearer <jwt>` فوروارد می‌شوند.

| Admin UI | BFF | Backend |
| --- | --- | --- |
| ورود | `POST /api/auth/login` | `POST /auth/login` (fallback: `/auth/signin`, `/login`) |
| خروج | `POST /api/auth/logout` | پاک کردن کوکی |
| نشست | `GET /api/auth/me` | `GET /auth/me` |
| کالکشن‌ها | `GET /api/collections` | `GET /collections` — اگر نبود، سولیتر / وینتیج / طلای سفید |
| ایجاد محصول | `POST /api/products` | `POST /products` سپس `GET /products/:id` |
| خواندن محصول | `GET /api/products/:id` | `GET /products/:id` — عمومی روی بک‌اند (شامل پیش‌نویس)؛ BFF همچنان نشست ادمین می‌خواهد |
| ویرایش محصول | `PATCH /api/products/:id` | `PATCH /products/:id` — JWT ادمین؛ همه فیلدها اختیاری؛ همان شکل ایجاد |
| گالری | `POST /api/uploads` | `POST /uploads` (یا `/media`, `/images`) — اختیاری |

### `POST /products` body

```json
{
  "name": "انگشتر سولیتر الماس",
  "slug": "solitaire-diamond-ring",
  "description": "… برلیان گرد ۰.۸ قیراط …",
  "price": 1280000000,
  "collectionId": "solitaire",
  "status": "published",
  "sizes": [50, 52, 54, 56, 58],
  "specs": {
    "weight": "۳٫۲ گرم",
    "karat": "طلای ۱۸ عیار (۷۵۰)",
    "gem": "برلیان طبیعی ۰.۸ قیراط · رنگ G · شفافیت VS1",
    "cut": "برلیان گرد (Round Brilliant) · ۵۷ وجه",
    "band": "طلای زرد ۱۸ عیار · بزل چهارچنگ دست‌ساز"
  },
  "imageIds": [],
  "urls": []
}
```

### قیمت: تومان → ریال

رابط کاربری قیمت را **تومان** نشان می‌دهد (مثل mockup). فیلد بک‌اند `price` عدد صحیح **IRR (ریال)** است.

`1 تومان = 10 ریال` → `priceIRR = toman * 10`

نمونه: `۱۲۸٬۰۰۰٬۰۰۰ تومان` → `1_280_000_000` IRR. تبدیل در `lib/format.ts` (`TOMAN_TO_IRR`).

اسلاگ اختیاری است؛ دکمه «تولید خودکار» از نام لاتین slug می‌سازد و برای نمونه سولیتر مقدار `solitaire-diamond-ring` را می‌گذارد.

## Sample product (۰.۸ قیراط)

همهٔ نمونه‌ها **۰.۸ / 0.8** هستند — هرگز 0.75 / ۰.۷۵.

- نام: انگشتر سولیتر الماس
- قیمت: ۱۲۸٬۰۰۰٬۰۰۰ تومان
- نگین: برلیان طبیعی ۰.۸ قیراط · رنگ G · شفافیت VS1
- پیش‌نمایش کارت: «برلیان ۰.۸ قیراط · رکاب طلای ۱۸ عیار»

برای پر کردن فرم افزودن با همین نمونه: `/products/new?sample=1`

ویرایش همان نمونه روی API ساختگی: `/products/prd_solitaire_01/edit`

## Scripts

| Command | |
| --- | --- |
| `npm i` | نصب وابستگی‌ها |
| `npm run dev` | Next.js روی :3000 |
| `npm run mock-api` | API ساختگی روی :3001 |
| `npm run build` | بیلد پروداکشن |
| `npm run start` | سرو بیلد |
| `npm run lint` | ESLint |

## Env

`NEXT_PUBLIC_API_URL` (پیش‌فرض `http://localhost:3001`) را در `.env.local` بگذارید. جزئیات در `.env.example`.
