import { AdminShell } from "@/components/admin/shell";
import { ProductForm } from "@/components/product/product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string }>;
}) {
  const params = await searchParams;
  return (
    <AdminShell title="افزودن محصول" eyebrow="محصولات · فرم جدید">
      <ProductForm prefillSample={params.sample === "1"} />
    </AdminShell>
  );
}
