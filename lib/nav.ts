export type AdminNavIcon = "products" | "gallery" | "orders" | "settings";

export type AdminNavItem = {
  href?: string;
  label: string;
  icon: AdminNavIcon;
  soon?: boolean;
  section: "store" | "system";
};

export function navItemIsActive(item: AdminNavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.href === "/gallery") {
    return (
      pathname === "/gallery" ||
      pathname.startsWith("/gallery/") ||
      pathname.startsWith("/admin/gallery") ||
      pathname.startsWith("/admin/media") ||
      pathname === "/media"
    );
  }
  if (item.href.startsWith("/products")) {
    return (
      pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/products") ||
      pathname.startsWith("/admin/products") ||
      pathname === "/admin"
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/products/new",
    label: "محصولات",
    icon: "products",
    section: "store",
  },
  {
    href: "/gallery",
    label: "رسانه / گالری",
    icon: "gallery",
    section: "store",
  },
  {
    label: "سفارشات",
    icon: "orders",
    soon: true,
    section: "store",
  },
  {
    label: "تنظیمات",
    icon: "settings",
    soon: true,
    section: "system",
  },
];
