import { AdminShell } from "@/components/admin/shell";
import { ExpireSession } from "@/components/product/expire-session";
import { ProductEditor } from "@/components/product/product-editor";
import { ProductFormSkeleton } from "@/components/product/product-skeleton";
import { loadProductForEdit } from "@/lib/product-load";

function productIdFromParam(id: string) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = productIdFromParam(id);
  const initialLoad = await loadProductForEdit(productId);
  if (initialLoad.status === "unauthorized") {
    return (
      <AdminShell
        title="ویرایش محصول"
        breadcrumb={[{ href: "/products", label: "محصولات" }, { label: "ویرایش" }]}
      >
        <ExpireSession />
        <ProductFormSkeleton variant="edit" />
      </AdminShell>
    );
  }
  return <ProductEditor key={productId} productId={productId} initialLoad={initialLoad} />;
}
