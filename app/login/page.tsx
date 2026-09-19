import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm rounded-xl border border-secondary bg-white p-8 shadow-sm">
        <p className="text-sm text-muted">ورود به پنل</p>
        <h1 className="mt-1 text-2xl font-semibold text-primary">انگشترباز</h1>
        <form className="mt-8 space-y-4" action="/admin">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-primary">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              className="rounded-md border border-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-primary"
            >
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="rounded-md border border-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-3 py-2.5 text-sm text-canvas"
          >
            ورود
          </button>
        </form>
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
