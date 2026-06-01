"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import { formatImportedAddressForForm } from "@/lib/place-search";
import { ActivityMapPreview } from "./ActivityMapPreview";

type PlaceSearchResult = {
  label: string;
  latitude: number;
  longitude: number;
};

type ActivityPlacePickerProps = {
  initialAddress?: string;
  initialLatitude?: string;
  initialLongitude?: string;
  latitudeErrors?: string[];
  locale: string;
  longitudeErrors?: string[];
};

function getFormValue(form: HTMLFormElement | null, key: string) {
  if (!form) {
    return "";
  }

  const value = new FormData(form).get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getPlaceQuery(address: string, city: string) {
  if (!address) {
    return city;
  }

  if (!city || address.toLowerCase().includes(city.toLowerCase())) {
    return address;
  }

  return `${address}, ${city}`;
}

function formatCoordinate(value: string) {
  const numberValue = Number.parseFloat(value);

  return Number.isFinite(numberValue) ? numberValue.toFixed(5) : value;
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="text-xs font-medium text-red-600" role="alert">
      {errors[0]}
    </p>
  );
}

export function ActivityPlacePicker({
  initialAddress,
  initialLatitude,
  initialLongitude,
  latitudeErrors,
  locale,
  longitudeErrors,
}: ActivityPlacePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = getCopy(locale).form;
  const [latitude, setLatitude] = useState(initialLatitude ?? "");
  const [longitude, setLongitude] = useState(initialLongitude ?? "");
  const [selectedLabel, setSelectedLabel] = useState(initialAddress ?? "");
  const [matchedQuery, setMatchedQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const latestSearchQueryRef = useRef("");
  const numericLatitude = Number.parseFloat(latitude);
  const numericLongitude = Number.parseFloat(longitude);
  const hasCoordinateInput = latitude.trim() !== "" && longitude.trim() !== "";
  const hasValidCoordinates =
    hasCoordinateInput &&
    Number.isFinite(numericLatitude) &&
    Number.isFinite(numericLongitude);

  async function searchPlace() {
    const form = containerRef.current?.closest("form") ?? null;
    const address = getFormValue(form, "address");
    const city = getFormValue(form, "city");
    const query = formatImportedAddressForForm(address || selectedLabel);

    if (query.length < 3) {
      setResults([]);
      setError(t.placeSearchNeedAddress);
      return;
    }

    setIsSearching(true);
    setError(null);
    latestSearchQueryRef.current = getPlaceQuery(query, city);

    try {
      const searchParams = new URLSearchParams({
        q: query,
        city,
        locale,
        limit: "5",
      });
      const response = await fetch(`/api/places/search?${searchParams}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        places?: PlaceSearchResult[];
      };

      if (!response.ok) {
        throw new Error("Place search failed");
      }

      const places = payload.places ?? [];
      setResults(places);
      setError(places.length > 0 ? null : t.placeSearchEmpty);
    } catch {
      setResults([]);
      setError(t.placeSearchFailed);
    } finally {
      setIsSearching(false);
    }
  }

  function selectPlace(place: PlaceSearchResult) {
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setSelectedLabel(place.label);
    setMatchedQuery(latestSearchQueryRef.current);
    setResults([]);
    setError(null);
  }

  function clearPlace() {
    setLatitude("");
    setLongitude("");
    setSelectedLabel("");
    setMatchedQuery("");
    setResults([]);
    setError(null);
  }

  useEffect(() => {
    const formElement = containerRef.current?.closest("form") ?? null;

    if (!formElement) {
      return;
    }

    function handleLocationInput(event: Event) {
      const target = event.target;

      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLSelectElement)
      ) {
        return;
      }

      if (!["address", "city"].includes(target.name)) {
        return;
      }

      const address = getFormValue(formElement, "address");
      const city = getFormValue(formElement, "city");
      const currentQuery = getPlaceQuery(address, city);

      if (hasCoordinateInput && matchedQuery && currentQuery !== matchedQuery) {
        setLatitude("");
        setLongitude("");
        setSelectedLabel("");
        setMatchedQuery("");
        setResults([]);
        setError(t.placeChangedClear);
      }
    }

    formElement.addEventListener("input", handleLocationInput);

    return () => {
      formElement.removeEventListener("input", handleLocationInput);
    };
  }, [hasCoordinateInput, matchedQuery, t.placeChangedClear]);

  useEffect(() => {
    const formElement = containerRef.current?.closest("form") ?? null;

    if (!formElement || !hasCoordinateInput || matchedQuery) {
      return;
    }

    const address = getFormValue(formElement, "address");
    const city = getFormValue(formElement, "city");
    const currentQuery = getPlaceQuery(address, city);

    if (currentQuery) {
      setMatchedQuery(currentQuery);
    }
  }, [hasCoordinateInput, matchedQuery]);

  return (
    <div
      ref={containerRef}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4"
    >
      <input name="latitude" type="hidden" value={latitude} />
      <input name="longitude" type="hidden" value={longitude} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MapPin className="h-4 w-4 text-moss" />
            {t.placePickerTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {t.placePickerHint}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
          {hasCoordinateInput ? (
            <Button
              className="h-9 flex-1 whitespace-nowrap px-3 text-xs sm:flex-none"
              type="button"
              variant="secondary"
              onClick={clearPlace}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              {t.placeClear}
            </Button>
          ) : null}
          <Button
            className="h-9 flex-1 whitespace-nowrap px-3 text-xs sm:flex-none"
            type="button"
            variant="secondary"
            onClick={searchPlace}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isSearching ? t.placeSearching : t.placeSearch}
          </Button>
        </div>
      </div>

      {hasCoordinateInput ? (
        <div
          className="grid gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          aria-live="polite"
        >
          <span>
            {t.placeSelected}: {formatCoordinate(latitude)},{" "}
            {formatCoordinate(longitude)}
          </span>
          {selectedLabel ? (
            <span className="line-clamp-2 font-normal text-emerald-700">
              {selectedLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
      <FieldError errors={latitudeErrors} />
      <FieldError errors={longitudeErrors} />

      {results.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-zinc-500">
            {t.placeSearchResults}
          </p>
          <div className="grid gap-2" role="list">
            {results.map((place) => (
              <div
                key={`${place.latitude}-${place.longitude}-${place.label}`}
                role="listitem"
              >
                <button
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-5 text-zinc-700 transition hover:border-moss hover:bg-paper"
                  type="button"
                  onClick={() => selectPlace(place)}
                >
                  {place.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasValidCoordinates ? (
        <ActivityMapPreview
          address={selectedLabel || initialAddress || t.placeSelected}
          latitude={numericLatitude}
          longitude={numericLongitude}
          openLabel={t.openMap}
          title={t.mapPreviewTitle}
        />
      ) : null}
    </div>
  );
}
