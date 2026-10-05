# انگشترباز — Admin

پنل ادمین فروشگاه انگشترباز (مستقل از فروشگاه). RTL فارسی، Vazirmatn، و توکن‌های برند mockupهای ANG-A0 / ANG-A1 / ANG-A2 / ANG-A3.

## Scope

- **ANG-A0** — پوسته ادمین: سایدبار + هدر چسبان + محتوا، برند «انگشترباز» + بج ادمین، ناوبری محصولات (فعال) و سفارشات/تنظیمات به‌زودی. در عرض کمتر از ۹۶۰px کشوی همبرگر +backdrop.
- **ANG-A1** — افزودن محصول: فرم کامل، پیش‌نمایش کارت زنده، اعتبارسنجی، اسکلتون، بنر/توست موفقیت، اتصال به API.
- **ANG-A2** — ویرایش محصول: `GET /products/:id` برای پر کردن فرم، `PATCH` برای ذخیره، اسکلتون / یافت‌نشد / خطا با تلاش مجدد / ذخیره / اعتبارسنجی / بنر موفقیت. قیمت UI تومان است و API ریال (÷۱۰ نمایش، ×۱۰ ذخیره).
- **ANG-A3** — گالری مرکزی رسانه: صفحه `/gallery`، آپلود presign→PUT→ثبت، چندانتخاب/حذف، و مودال «انتخاب از گالری» روی افزودن/ویرایش محصول (`imageIds[]`).
- احراز هویت JWT ادمین با کوکی **httpOnly**.
- خارج از محدوده: فروشگاه، سفارشات/تنظیمات واقعی، فهرست محصولات، دیپلوی.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `lang="fa"` / `dir="rtl"` + [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- برند: Primary `#541926` · Strong `#3F121C` · Secondary `#E0E0E0` · Canvas `#F8F4EC` · Surface `#FFFFFF` · Ink `#1C1917` · Muted `#78716C` · Border `#E7E0D4`

## راه‌اندازی محلی

NestJS ([angoshtarbaz-backend](https://github.com/javadbasiri/angoshtarbaz-backend)) روی پورت **3000** گوش می‌دهد (`PORT || 3000`، بدون پیشوند سراسری). پنل ادمین روی **3001** اجرا می‌شود تا با Nest تداخل نداشته باشد. این همان پیش‌فرض `ADMIN_ORIGIN` بک‌اند است (`http://localhost:3001`).

`NEXT_PUBLIC_API_URL` الزامی است و هنگام بیلد داخل باندل inline می‌شود. بعد از تغییر آن، `next dev` را ری‌استارت کنید یا دوباره `npm run build` بگیرید.

```bash
# مخزن بک‌اند
npm run start:dev
# http://localhost:3000
```

```bash
# همین مخزن
npm i
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
# http://localhost:3001
```

ورود نمونه: `admin@angoshtarbaz.local` / `admin123456`

اگر ردیف ادمین از قبل در پایگاه وجود داشته باشد، سید رمز را بازنشانی نمی‌کند. در آن صورت با همان رمز قبلی وارد شوید، یا ردیف را در دیتابیس اصلاح کنید.

### API ساختگی

اگر بک‌اند در دسترس نیست، API ساختگی را روی پورت **3002** اجرا کنید و ادمین را به آن وصل کنید:

```bash
npm run mock-api
# http://localhost:3002  — login / collections / products / gallery
# نمونه: GET /products/prd_solitaire_01
```

در `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

سپس dev server را ری‌استارت کنید (مقدار هنگام بیلد ثابت می‌شود). پورت mock با `MOCK_API_PORT` قابل تغییر است.

### CORS

بک‌اند `ADMIN_ORIGIN` را پیش‌فرض `http://localhost:3001` می‌گذارد و پنل هم روی همین مبدأ اجرا می‌شود. اگر پورت ادمین را عوض کردید، `ADMIN_ORIGIN` بک‌اند را با آن یکی کنید. در محیط محلی بدون env، بک‌اند Origin را reflect می‌کند.

## Seed

| | |
| --- | --- |
| ایمیل | `admin@angoshtarbaz.local` |
| رمز | `admin123456` |
| نقش | `admin` (JWT) |

ورود از `/login` به `POST {API}/auth/login` پروکسی می‌شود و توکن در کوکی httpOnly `angoshtarbaz_admin_session` ذخیره می‌گردد. مسیرهای ادمین بدون نشست به `/login` می‌روند.

اگر کاربر ادمین از قبل در دیتابیس بوده، اجرای دوبارهٔ سید رمز `admin123456` را بازنشانی نمی‌کند.

## Routes

| Path | |
| --- | --- |
| `/login` | ورود JWT |
| `/` و `/dashboard` | داشبورد / placeholder داخل پوسته |
| `/products/new` | افزودن محصول (ANG-A1) |
| `/products/[id]/edit` | ویرایش محصول (ANG-A2) |
| `/gallery` | گالری مرکزی رسانه (ANG-A3) |
| `/admin` و `/admin/products/new` | redirect به مسیرهای بالا (سازگاری اسکلت) |
| `/admin/products/[id]/edit` | redirect به `/products/[id]/edit` |
| `/admin/gallery` و `/admin/media` | redirect به `/gallery` |

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
| فهرست گالری | `GET /api/gallery` | `GET /gallery` — `{ data, meta }` |
| Presign آپلود | `POST /api/gallery/presign` | `POST /gallery/presign` → `{ uploadUrl, headers, key, publicUrl, provider }` |
| آپلود بایت | `PUT /api/gallery/upload/:key` | `PUT /gallery/upload/:key` (mock) یا URL امضاشده S3 |
| ثبت فایل | `POST /api/gallery` | `POST /gallery` — بعد از آپلود؛ `id` برای `imageIds[]` |
| حذف فایل | `DELETE /api/gallery/:id` | `DELETE /gallery/:id` |
| فایل عمومی (mock) | — | `GET /gallery/files/:key` |
| آپلود قدیمی | `POST /api/uploads` | `POST /uploads` — سازگاری؛ جریان اصلی گالری است |

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

## Gallery upload (ANG-A3)

آپلود از مرورگر مستقیم به S3 نمی‌رود مگر `uploadUrl` امضاشده باشد. جریان:

1. `POST /api/gallery/presign` با `{ filename, contentType, size }`
2. `PUT` بایت فایل به `uploadUrl` (برای mock، BFF آن را به `/api/gallery/upload/:key` بازنویسی می‌کند تا JWT httpOnly همراه شود)
3. `POST /api/gallery` برای ثبت متادیتا و گرفتن `id`
4. تازه‌سازی گرید / پیوست به محصول با `imageIds[]`

قالب مجاز: JPG / PNG / WebP تا ۱۲ مگابایت و MP4 تا ۵۰ مگابایت. اگر بک‌اند در دسترس نباشد صفحه گالری و مودال انتخاب خطا را نشان می‌دهند.

از افزودن/ویرایش محصول، «انتخاب از گالری» چند فایل را با ترتیب انتخاب می‌کند؛ تصویر اول تصویر اصلی کارت است.

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
| `npm run dev` | Next.js روی :3001 |
| `npm run mock-api` | API ساختگی روی :3002 (`MOCK_API_PORT`) |
| `npm run build` | بیلد پروداکشن |
| `npm run start` | سرو بیلد روی :3001 |
| `npm run lint` | ESLint |
| `npm test` | تست واحد استخراج توکن ورود |

## Env

`NEXT_PUBLIC_API_URL` الزامی است (پیش‌فرض کد `http://localhost:3000`، یعنی Nest). برای mock: `http://localhost:3002`. مقدار هنگام بیلد inline می‌شود؛ جزئیات در `.env.example`.
