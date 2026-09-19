export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/products/new", label: "افزودن محصول" },
];
