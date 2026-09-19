import Link from "next/link";
import { AdminShell } from "@/components/admin/shell";

export default function DashboardPage() {
  return (
    <AdminShell title="داشبورد" eyebrow="ANG-A0 · مرجع چیدمان">
      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="panel__head">
          <h2 className="panel__title">پوسته ادمین (ANG-A0)</h2>
          <span className="panel__hint">سایدبار · هدر · ناحیه محتوا</span>
        </div>
        <div className="panel__body">
          <p style={{ marginBottom: 12, color: "var(--color-muted)" }}>
            این صفحه چیدمان پوسته را نشان می‌دهد. ناوبری: محصولات · رسانه / گالری · سفارشات و تنظیمات
            (به‌زودی).
          </p>
          <p style={{ marginBottom: 16 }}>
            در عرض کمتر از ۹۶۰px، سایدبار به‌صورت کشو باز می‌شود — دکمه همبرگر را در هدر امتحان
            کنید.
          </p>
          <div className="page-actions" style={{ justifyContent: "flex-start", paddingBottom: 0 }}>
            <Link className="btn btn--primary" href="/products/new">
              رفتن به افزودن محصول →
            </Link>
            <Link className="btn btn--secondary" href="/products/prd_solitaire_01/edit">
              ویرایش محصول نمونه →
            </Link>
            <Link className="btn btn--secondary" href="/gallery">
              گالری رسانه →
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
