export type AdminNavItem = {
  href?: string;
  label: string;
  icon: "products" | "orders" | "settings";
  soon?: boolean;
  section: "store" | "system";
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/products/new",
    label: "محصولات",
    icon: "products",
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
