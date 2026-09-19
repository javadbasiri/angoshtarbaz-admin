import Link from "next/link";
import { AdminHeader } from "@/components/admin/header";

export default function AdminHomePage() {
  return (
    <>
      <AdminHeader title="داشبورد" />
      <main className="flex-1 p-6">
        <section className="max-w-2xl rounded-lg border border-secondary bg-white p-6">
          <h2 className="text-lg font-semibold text-primary">خوش آمدید</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            اسکلت پنل ادمین آماده است. شل سایدبار (ANG-A0) و فرم افزودن محصول
            (ANG-A1) را از اینجا ادامه دهید.
          </p>
          <Link
            href="/admin/products/new"
            className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-canvas"
          >
            افزودن محصول
          </Link>
        </section>
      </main>
    </>
  );
}
