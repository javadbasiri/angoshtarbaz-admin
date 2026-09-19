import Link from "next/link";
import { AlertIcon } from "@/components/admin/icons";
import { RING_SIZE_OPTIONS } from "@/types/product";

type ProductEditPlaceholderProps = {
  productId: string;
};

/**
 * ANG-A2 scaffold only: disabled field stubs that reuse the create-form
 * labels/classes. Not a finished edit UI and not wired to PATCH/PUT.
 */
export function ProductEditPlaceholder({ productId }: ProductEditPlaceholderProps) {
  return (
    <>
      <div className="alert alert--info" role="status">
        <span className="alert__icon">
          <AlertIcon />
        </span>
        <div>
          <p className="alert__title">رابط ویرایش در انتظار تأیید طراحی است</p>
          <p className="alert__body">
            این صفحه اسکلت مسیر ANG-A2 است. شناسه محصول از پارامتر مسیر خوانده می‌شود؛ فیلدها
            غیرفعال‌اند و ذخیره/انتشار هنوز وصل نشده است.
          </p>
        </div>
      </div>

      <div className="page-actions">
        <Link className="btn btn--secondary" href="/products/new">
          افزودن محصول
        </Link>
        <button type="button" className="btn btn--secondary" disabled>
          ذخیره پیش‌نویس
        </button>
        <button type="button" className="btn btn--primary" disabled>
          انتشار
        </button>
      </div>

      <div className="add-product">
        <div className="add-product__main">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">شناسه محصول</h2>
              <span className="panel__hint">از پارامتر مسیر</span>
            </div>
            <div className="panel__body form-grid">
              <div className="field">
                <label className="field__label" htmlFor="product-id">
                  id
                </label>
                <input
                  className="input"
                  id="product-id"
                  name="id"
                  type="text"
                  dir="ltr"
                  style={{ textAlign: "left" }}
                  value={productId}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">اطلاعات پایه</h2>
              <span className="panel__hint">همان فیلدهای فرم ایجاد · غیرفعال</span>
            </div>
            <div className="panel__body form-grid">
              <div className="field">
                <label className="field__label" htmlFor="name">
                  نام
                </label>
                <input className="input" id="name" name="name" type="text" disabled />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="slug">
                  اسلاگ
                </label>
                <input
                  className="input"
                  id="slug"
                  name="slug"
                  type="text"
                  dir="ltr"
                  style={{ textAlign: "left" }}
                  disabled
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="description">
                  توضیحات
                </label>
                <textarea className="textarea" id="description" name="description" disabled />
              </div>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label className="field__label" htmlFor="priceToman">
                    قیمت (تومان)
                  </label>
                  <input className="input" id="priceToman" name="priceToman" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="collectionId">
                    کالکشن
                  </label>
                  <select className="select" id="collectionId" name="collectionId" disabled>
                    <option value="">انتخاب نشده</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="stock">
                    موجودی
                  </label>
                  <input className="input" id="stock" name="stock" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="status">
                    وضعیت
                  </label>
                  <select className="select" id="status" name="status" disabled>
                    <option value="draft">پیش‌نویس</option>
                    <option value="published">منتشرشده</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">سایز و مشخصات</h2>
              <span className="panel__hint">همان قرارداد ایجاد محصول</span>
            </div>
            <div className="panel__body form-grid">
              <div className="field">
                <span className="field__label">سایزها</span>
                <div className="size-chips">
                  {RING_SIZE_OPTIONS.map((size) => (
                    <button key={size} type="button" className="size-chip" disabled>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label className="field__label" htmlFor="weight">
                    وزن
                  </label>
                  <input className="input" id="weight" name="weight" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="karat">
                    عیار
                  </label>
                  <input className="input" id="karat" name="karat" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="gem">
                    نگین
                  </label>
                  <input className="input" id="gem" name="gem" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="cut">
                    تراش
                  </label>
                  <input className="input" id="cut" name="cut" type="text" disabled />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="band">
                    رکاب
                  </label>
                  <input className="input" id="band" name="band" type="text" disabled />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
