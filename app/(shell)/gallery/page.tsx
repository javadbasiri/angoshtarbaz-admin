import { AdminShell } from "@/components/admin/shell";
import { GalleryLibrary } from "@/components/gallery/gallery-library";

export default function GalleryPage() {
  return (
    <AdminShell
      title="گالری مرکزی رسانه"
      breadcrumb={[
        { href: "/", label: "ادمین" },
        { label: "گالری رسانه" },
      ]}
    >
      <GalleryLibrary />
    </AdminShell>
  );
}
