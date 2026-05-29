import { ExternalLink, MapPin } from "lucide-react";

type ActivityMapPreviewProps = {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  openLabel: string;
  className?: string;
};

function getMapBounds(latitude: number, longitude: number) {
  const latDelta = 0.006;
  const lonDelta = 0.01;

  return [
    longitude - lonDelta,
    latitude - latDelta,
    longitude + lonDelta,
    latitude + latDelta,
  ].join(",");
}

export function ActivityMapPreview({
  latitude,
  longitude,
  title,
  address,
  openLabel,
  className,
}: ActivityMapPreviewProps) {
  const embedUrl = new URL("https://www.openstreetmap.org/export/embed.html");
  embedUrl.searchParams.set("bbox", getMapBounds(latitude, longitude));
  embedUrl.searchParams.set("layer", "mapnik");
  embedUrl.searchParams.set("marker", `${latitude},${longitude}`);

  const externalUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <div
      className={
        className
          ? `overflow-hidden rounded-lg border border-black/10 bg-white ${className}`
          : "overflow-hidden rounded-lg border border-black/10 bg-white"
      }
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MapPin className="h-4 w-4 shrink-0 text-moss" />
            {title}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">{address}</p>
        </div>
        <a
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-white px-2.5 text-xs font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
          href={externalUrl}
          target="_blank"
          rel="noreferrer"
        >
          {openLabel}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <iframe
        className="block aspect-[16/9] w-full border-0 sm:aspect-[21/9]"
        src={embedUrl.toString()}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <p className="border-t border-black/5 px-4 py-2 text-[11px] text-zinc-400">
        Map data:{" "}
        <a
          className="underline-offset-2 hover:underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
