import { AdminShell } from "@/components/admin/shell";
import { ProductEditPlaceholder } from "@/components/product/product-edit-placeholder";

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

  return (
    <AdminShell title="ویرایش محصول" eyebrow="محصولات · اسکلت ANG-A2">
      <ProductEditPlaceholder productId={productIdFromParam(id)} />
    </AdminShell>
  );
}

