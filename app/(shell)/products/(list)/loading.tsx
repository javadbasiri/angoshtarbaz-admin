import { AdminShell } from "@/components/admin/shell";
import { ProductListSkeleton } from "@/components/product/product-list";

export default function ProductsLoading() {
  return (
    <AdminShell
      title="محصولات"
      breadcrumb={[
        { href: "/", label: "ادمین" },
        { label: "محصولات" },
      ]}
    >
      <ProductListSkeleton />
    </AdminShell>
  );
}
