import { redirect } from "next/navigation";
import { parseProductListQuery, productListHref } from "@/lib/product-list";

export default async function AdminProductsAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseProductListQuery(await searchParams);
  redirect(productListHref(query));
}
