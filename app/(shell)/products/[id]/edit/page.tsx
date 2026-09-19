import { ProductEditor } from "@/components/product/product-editor";

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
  return <ProductEditor productId={productIdFromParam(id)} />;
}
