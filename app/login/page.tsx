import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm rounded-xl border border-secondary bg-white p-8 shadow-sm">
        <p className="text-sm text-muted">ورود به پنل</p>
        <h1 className="mt-1 text-2xl font-semibold text-primary">انگشترباز</h1>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted">
          احراز هویت واقعی در ANG-A0 به بک‌اند وصل می‌شود.{" "}
          <Link href="/admin" className="text-primary underline">
            ورود موقت به پنل
          </Link>
        </p>
      </section>
    </main>
  );
}
