import { AdminHeader } from "@/components/admin/header";
import { ProductForm } from "@/components/product/product-form";

export default function NewProductPage() {
  return (
    <>
      <AdminHeader title="افزودن محصول" />
      <main className="flex-1 p-6">
        <ProductForm />
      </main>
    </>
  );
}
