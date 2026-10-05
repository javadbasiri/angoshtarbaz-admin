# انگشترباز — Admin

پنل ادمین فروشگاه انگشترباز (مستقل از فروشگاه). RTL فارسی، Vazirmatn، و توکن‌های برند mockupهای ANG-A0 / ANG-A1 / ANG-A2 / ANG-A3.

## Scope

- **ANG-A0** — پوسته ادمین: سایدبار + هدر چسبان + محتوا، برند «انگشترباز» + بج ادمین، ناوبری محصولات (فعال) و سفارشات/تنظیمات به‌زودی. در عرض کمتر از ۹۶۰px کشوی همبرگر +backdrop.
- **ANG-A1** — افزودن محصول: فرم کامل، پیش‌نمایش کارت زنده، اعتبارسنجی، اسکلتون، بنر/توست موفقیت، اتصال به API.
- **ANG-A2** — ویرایش محصول: `GET /products/:id` برای پر کردن فرم، `PATCH` برای ذخیره، اسکلتون / یافت‌نشد / خطا با تلاش مجدد / ذخیره / اعتبارسنجی / بنر موفقیت. قیمت UI تومان است و API ریال (÷۱۰ نمایش، ×۱۰ ذخیره).
- **ANG-A3** — گالری مرکزی رسانه: صفحه `/gallery`، آپلود presign→PUT→ثبت، چندانتخاب/حذف، و مودال «انتخاب از گالری» روی افزودن/ویرایش محصول (`imageIds[]`).
- **ANG-A6** — همان `/gallery` با درخت پوشه، وقتی `NEXT_PUBLIC_GALLERY_FOLDERS=1`. پیش‌فرض خاموش است و گالری تخت ANG-A3 را عوض نمی‌کند. داده فعلاً stub درون‌حافظه است و Nest صدا زده نمی‌شود.
- **ANG-A4** — فهرست محصولات: `/products` (و alias `/admin/products`). سرور Next مستقیماً `GET {NEXT_PUBLIC_API_URL}/products` را با JWT کوکی httpOnly صدا می‌زند. ستون موجودی عمداً نیست.
- احراز هویت JWT ادمین با کوکی **httpOnly**.
- خارج از محدوده: فروشگاه، سفارشات/تنظیمات واقعی، دیپلوی.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `lang="fa"` / `dir="rtl"` + [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- برند: Primary `#541926` · Strong `#3F121C` · Secondary `#E0E0E0` · Canvas `#F8F4EC` · Surface `#FFFFFF` · Ink `#1C1917` · Muted `#78716C` · Border `#E7E0D4`

## راه‌اندازی محلی

NestJS ([angoshtarbaz-backend](https://github.com/javadbasiri/angoshtarbaz-backend)) روی پورت **3000** گوش می‌دهد (`PORT || 3000`، بدون پیشوند سراسری). پنل ادمین روی **3001** اجرا می‌شود تا با Nest تداخل نداشته باشد. این همان پیش‌فرض `ADMIN_ORIGIN` بک‌اند است (`http://localhost:3001`).

`NEXT_PUBLIC_API_URL` باید مبدأ Nest باشد (`http://localhost:3000`) و هنگام بیلد داخل باندل inline می‌شود. مقدار خالی یا فقط فاصله نادیده گرفته می‌شود و به پیش‌فرض (`http://localhost:3000`) برمی‌گردد. بعد از تغییر آن، `next dev` را ری‌استارت کنید یا دوباره `npm run build` بگیرید.

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

ورود از `/login` یک Server Action است که `POST {API}/auth/login` را صدا می‌زند و توکن را در کوکی httpOnly `angoshtarbaz_admin_session` ذخیره می‌کند. مسیرهای ادمین بدون نشست به `/login` می‌روند. پاسخ ۴۰۱ از بک‌اند همان کوکی را پاک می‌کند و به `/login` برمی‌گرداند.

اگر کاربر ادمین از قبل در دیتابیس بوده، اجرای دوبارهٔ سید رمز `admin123456` را بازنشانی نمی‌کند.

## Routes

| Path | |
| --- | --- |
| `/login` | ورود JWT |
| `/` و `/dashboard` | داشبورد / placeholder داخل پوسته |
| `/products` | فهرست محصولات (ANG-A4) — جستجو، فیلتر وضعیت، صفحه‌بندی در query string |
| `/products/new` | افزودن محصول (ANG-A1) |
| `/products/[id]/edit` | ویرایش محصول (ANG-A2) |
| `/gallery` | گالری مرکزی رسانه (ANG-A3). با `NEXT_PUBLIC_GALLERY_FOLDERS=1` نمای پوشه‌ای ANG-A6 و `?prefix=` |
| `/admin` و `/admin/products/new` | redirect به مسیرهای بالا (سازگاری اسکلت) |
| `/admin/products` | redirect به `/products` (query حفظ می‌شود) |
| `/admin/products/[id]/edit` | redirect به `/products/[id]/edit` |
| `/admin/gallery` و `/admin/media` | redirect به `/gallery` |

## API mapping

ادمین Route Handler ندارد. همهٔ فراخوانی‌ها از سرور Next (صفحه یا Server Action) با `Authorization: Bearer` و JWT کوکی httpOnly به `{NEXT_PUBLIC_API_URL}` می‌روند. توکن به جاوااسکریپت مرورگر داده نمی‌شود.

| Admin UI | فراخوانی سرور | Backend |
| --- | --- | --- |
| ورود | `loginAction` | `POST /auth/login` |
| خروج | `logoutAction` | پاک کردن کوکی؛ بدون درخواست بک‌اند |
| کاربر فعلی | `loadCurrentUser` در لایهٔ `(shell)` | `GET /auth/profile` — `{ id, email, firstName, lastName, role }` |
| کالکشن‌ها | `loadCollectionsAction` | `GET /collections` — اگر خالی یا قطع بود، سولیتر / وینتیج / طلای سفید |
| فهرست محصولات | صفحهٔ سروری | `GET /products?status=&search=&page=&limit=` |
| ایجاد محصول | `createProductAction` سپس `getProductAction` | `POST /products` سپس `GET /products/:id` |
| خواندن محصول | `loadProductForEdit` / `getProductAction` | `GET /products/:id` — عمومی روی بک‌اند (شامل پیش‌نویس)؛ ادمین همچنان نشست می‌خواهد |
| ویرایش محصول | `updateProductAction` | `PATCH /products/:id` — JWT ادمین؛ همه فیلدها اختیاری |
| فهرست گالری | `listGalleryAction` | `GET /gallery` — `{ data, meta }` |
| Presign آپلود | `presignGalleryAction` | `POST /gallery/presign` — `{ filename, mime, size }` |
| آپلود بایت | مرورگر، مستقیم به `uploadUrl` | `PUT` با هدرهای presign و بدون JWT. mock: `?token=` روی خود API. s3: URL امضاشده |
| ثبت فایل | `registerGalleryAction` | `POST /gallery` — `{ url, key, mime, size, originalName }`؛ `id` برای `imageIds[]` |
| حذف فایل | `deleteGalleryAction` | `DELETE /gallery/:id` |
| فایل عمومی (mock) | مرورگر، مستقیم | `GET /gallery/files/:key` |

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

1. Server Action: `POST /gallery/presign` با `{ filename, mime, size }` و JWT ادمین. `contentType` فایل به `mime` نگاشت می‌شود. `kind` فقط در اعتبارسنجی UI (`isAllowedGalleryFile`) می‌ماند.
2. مرورگر `PUT` بایت را مستقیم به `uploadUrl` می‌فرستد، با هدرهای presign و بدون `Authorization`. برای `provider: "mock"` آدرس روی خود API است و `?token=` احراز هویت است. برای `provider: "s3"` آدرس امضاشدهٔ باکت است.
3. Server Action: `POST /gallery` با `{ url, key, mime, size, originalName }` برای ثبت و گرفتن `id`. `url` همان `publicUrl` پاسخ presign است و `originalName` نام اصلی فایل است.
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
| `npm test` | تست واحد قیمت، query فهرست، نام هدر، مقصد آپلود گالری، بدنهٔ presign/ثبت، استخراج توکن ورود، و قرارداد پوشه‌های گالری |

## Env

`NEXT_PUBLIC_API_URL` باید مبدأ Nest باشد (`http://localhost:3000`). ادمین روی ۳۰۰۱ و API ساختگی روی ۳۰۰۲ است. مقدار خالی یا فقط فاصله به پیش‌فرض برمی‌گردد و هنگام بیلد inline می‌شود. برای mock: `http://localhost:3002`. جزئیات در `.env.example`.

`NEXT_PUBLIC_GALLERY_FOLDERS` پیش‌فرض خاموش است. فقط مقدار `1` یا `true` (بعد از trim) نمای پوشه‌ای ANG-A6 را روشن می‌کند. مقدار خالی یعنی خاموش. این پرچم هم هنگام بیلد inline می‌شود.

## Gallery folders (ANG-A6)

پوشه‌ها پیشوند `key` هستند (ریشه `gallery/`). پوشهٔ خالی یک آبجکت صفر-بایتی `{prefix}.keep` است و در گرید فایل‌ها نشان داده نمی‌شود. آپلود همیشه به پوشهٔ فعلی می‌رود. در ریشهٔ بدون پوشه، دکمهٔ اصلی «پوشه جدید» است و آپلود کم‌رنگ است (مسدود نیست).

تا وقتی آداپتر Nest در PR بعدی وصل شود، با روشن بودن پرچم هیچ درخواست پوشه‌ای به بک‌اند نمی‌رود. رابط `GalleryFoldersClient` همان مسیرهای تأییدشده را مدل می‌کند:

| عمل | Nest (بعداً) |
| --- | --- |
| فهرست یک سطح | `GET /gallery/browse?prefix=&delimiter=/` |
| ساخت پوشه | `POST /gallery/folders` `{ parentPrefix, name }` |
| تغییر نام | `POST /gallery/folders/rename` `{ fromPrefix, toName }` یا `toPrefix` |
| حذف پوشه خالی | `DELETE /gallery/folders?prefix=` — اگر پر باشد `409` با `FOLDER_NOT_EMPTY` و `objectCount` |
| جابه‌جایی | `POST /gallery/objects/move` `{ keys, destinationPrefix, onConflict }` و `onConflict` یکی از `replace` \| `autoRename` \| `skip` |
| Presign داخل پوشه | `POST /gallery/presign` با `{ filename, mime, size, prefix }` — کلید = پیشوند + نام پاک‌شده |

`GET /gallery` صفحه‌بندی‌شده برای حالت خاموش پرچم سر جایش می‌ماند. Route Handler جدید ساخته نشده. ناوبری پوشه با query `?prefix=` است؛ اگر نباشد، پوشهٔ نمونه `gallery/rings/red/` باز می‌شود.
