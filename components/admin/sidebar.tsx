"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/nav";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-secondary bg-primary text-canvas">
      <div className="border-b border-white/15 px-5 py-6">
        <Link href="/admin" className="block text-lg font-semibold">
          انگشترباز
        </Link>
        <p className="mt-1 text-xs text-canvas/70">پنل مدیریت</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="منوی ادمین">
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-canvas text-primary"
                  : "text-canvas/90 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
