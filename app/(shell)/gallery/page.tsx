import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { GalleryFoldersLibrary, GalleryFoldersSkeleton } from "@/components/gallery/gallery-folders";
import { GalleryLibrary } from "@/components/gallery/gallery-library";
import { env } from "@/lib/env";

export default function GalleryPage() {
  return (
    <AdminShell
      title="گالری مرکزی رسانه"
      breadcrumb={[
        { href: "/", label: "ادمین" },
        { label: "گالری رسانه" },
      ]}
    >
      {env.galleryFolders ? (
        <Suspense fallback={<GalleryFoldersSkeleton />}>
          <GalleryFoldersLibrary />
        </Suspense>
      ) : (
        <GalleryLibrary />
      )}
    </AdminShell>
  );
}
