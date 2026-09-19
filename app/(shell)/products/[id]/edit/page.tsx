import { ProductEditor } from "@/components/product/product-editor";
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
  return <ProductEditor key={productId} productId={productId} initialLoad={initialLoad} />;
}
