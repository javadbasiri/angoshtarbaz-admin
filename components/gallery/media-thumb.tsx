import { PersonPlaceholder, PlayPlaceholder } from "@/components/admin/icons";
import { placeholderClass } from "@/lib/gallery";
import type { GalleryKind } from "@/types/gallery";

export function MediaThumb({
  id,
  url,
  kind,
  label,
  className = "",
}: {
  id: string;
  url?: string;
  kind: GalleryKind;
  label?: string;
  className?: string;
}) {
  const hasMedia = Boolean(url);
  return (
    <div className={`media-tile__thumb ${placeholderClass(id, kind)}${hasMedia ? " has-media" : ""} ${className}`.trim()}>
      {url ? (
        kind === "video" ? (
          <video src={url} muted playsInline preload="metadata" />
        ) : (
          // Remote / object URLs — not next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        )
      ) : kind === "video" ? (
        <PlayPlaceholder />
      ) : (
        <PersonPlaceholder />
      )}
      {label ? <span className="media-tile__label">{label}</span> : null}
    </div>
  );
}
