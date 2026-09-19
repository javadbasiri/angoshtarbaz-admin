import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__brand">
          <strong className="sidebar__logo">انگشترباز</strong>
          <span className="sidebar__badge">ادمین</span>
        </div>
        <p className="login-card__eyebrow">ورود به پنل</p>
        <h1 className="login-card__title">انگشترباز</h1>
        <p className="login-card__lead">
          برای مدیریت محصولات وارد حساب ادمین شوید. نشست به‌صورت کوکی httpOnly ذخیره می‌شود.
        </p>
        <Suspense fallback={<p className="field__hint">در حال بارگذاری فرم ورود…</p>}>
          <LoginForm />
        </Suspense>
        <p className="login-card__seed">
          حساب نمونه: <strong>admin@angoshtarbaz.local</strong> / <strong>admin123456</strong>
          <br />
          API پیش‌فرض: <code>http://localhost:3001</code>
        </p>
      </section>
    </main>
  );
}
