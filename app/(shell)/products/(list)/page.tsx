import { AdminShell } from "@/components/admin/shell";
import { ExpireSession } from "@/components/product/expire-session";
import { ProductList, ProductListSkeleton } from "@/components/product/product-list";
import { loadProductList } from "@/lib/product-list-load";
import { parseProductListQuery } from "@/lib/product-list";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseProductListQuery(await searchParams);
  const load = await loadProductList(query);

  return (
    <AdminShell
      title="محصولات"
      breadcrumb={[
        { href: "/", label: "ادمین" },
        { label: "محصولات" },
      ]}
    >
      {load.status === "unauthorized" ? (
        <>
          <ExpireSession />
          <ProductListSkeleton />
        </>
      ) : (
        <ProductList query={query} load={load} />
      )}
    </AdminShell>
  );
}
