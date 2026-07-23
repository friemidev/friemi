"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, MapPin, X } from "lucide-react";
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
  addressErrors?: string[];
  addressFooter?: ReactNode;
  addressInputClassName?: string;
  addressLabel?: string;
  addressPlaceholder?: string;
  addressRequired?: boolean;
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

const fallbackAddressInputClassName =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-moss focus:ring-2 focus:ring-moss/20";

export function ActivityPlacePicker({
  addressErrors,
  addressFooter,
  addressInputClassName,
  addressLabel,
  addressPlaceholder,
  addressRequired = false,
  initialAddress,
  initialLatitude,
  initialLongitude,
  latitudeErrors,
  locale,
  longitudeErrors,
}: ActivityPlacePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const searchRequestIdRef = useRef(0);
  const skipNextSuggestionRef = useRef(false);
  const t = getCopy(locale).form;
  const [addressInput, setAddressInput] = useState(initialAddress ?? "");
  const [latitude, setLatitude] = useState(initialLatitude ?? "");
  const [longitude, setLongitude] = useState(initialLongitude ?? "");
  const [selectedLabel, setSelectedLabel] = useState(initialAddress ?? "");
  const [matchedQuery, setMatchedQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const numericLatitude = Number.parseFloat(latitude);
  const numericLongitude = Number.parseFloat(longitude);
  const hasCoordinateInput = latitude.trim() !== "" && longitude.trim() !== "";
  const hasValidCoordinates =
    hasCoordinateInput &&
    Number.isFinite(numericLatitude) &&
    Number.isFinite(numericLongitude);

  async function searchPlace({
    openResults = true,
    showEmptyError = true,
  } = {}) {
    const form = containerRef.current?.closest("form") ?? null;
    const address = addressInput.trim();
    const city = getFormValue(form, "city");
    const query = formatImportedAddressForForm(address || selectedLabel);

    if (query.length < 3) {
      searchRequestIdRef.current += 1;
      setResults([]);
      setIsSuggestionOpen(false);
      setError(showEmptyError ? t.placeSearchNeedAddress : null);
      return;
    }

    setIsSearching(true);
    setError(null);
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    try {
      const searchParams = new URLSearchParams({
        q: query,
        city,
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
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setResults(places);
      setIsSuggestionOpen(openResults && places.length > 0);
      setError(
        showEmptyError && places.length === 0 ? t.placeSearchEmpty : null,
      );
    } catch {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setResults([]);
      setIsSuggestionOpen(false);
      setError(showEmptyError ? t.placeSearchFailed : null);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }

  function selectPlace(place: PlaceSearchResult) {
    const form = containerRef.current?.closest("form") ?? null;
    const city = getFormValue(form, "city");
    const nextAddress = place.label;

    skipNextSuggestionRef.current = true;
    setAddressInput(nextAddress);
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setSelectedLabel(nextAddress);
    setMatchedQuery(
      getPlaceQuery(formatImportedAddressForForm(nextAddress), city),
    );
    setResults([]);
    setIsSuggestionOpen(false);
    setError(null);
  }

  function clearPlace() {
    setLatitude("");
    setLongitude("");
    setSelectedLabel("");
    setMatchedQuery("");
    setResults([]);
    setIsSuggestionOpen(false);
    setError(null);
  }

  function handleAddressChange(event: ChangeEvent<HTMLInputElement>) {
    const nextAddress = event.target.value;
    const form = containerRef.current?.closest("form") ?? null;
    const city = getFormValue(form, "city");
    const currentQuery = getPlaceQuery(
      formatImportedAddressForForm(nextAddress),
      city,
    );

    setAddressInput(nextAddress);

    if (hasCoordinateInput && matchedQuery && currentQuery !== matchedQuery) {
      setLatitude("");
      setLongitude("");
      setSelectedLabel("");
      setMatchedQuery("");
      setError(t.placeChangedClear);
    } else {
      setError(null);
    }
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

      if (target.name !== "city") {
        return;
      }

      const address = addressInput.trim();
      const city = getFormValue(formElement, "city");
      const currentQuery = getPlaceQuery(
        formatImportedAddressForForm(address),
        city,
      );

      if (hasCoordinateInput && matchedQuery && currentQuery !== matchedQuery) {
        setLatitude("");
        setLongitude("");
        setSelectedLabel("");
        setMatchedQuery("");
        setResults([]);
        setIsSuggestionOpen(false);
        setError(t.placeChangedClear);
      }
    }

    formElement.addEventListener("input", handleLocationInput);

    return () => {
      formElement.removeEventListener("input", handleLocationInput);
    };
  }, [addressInput, hasCoordinateInput, matchedQuery, t.placeChangedClear]);

  useEffect(() => {
    if (skipNextSuggestionRef.current) {
      skipNextSuggestionRef.current = false;
      return;
    }

    const query = formatImportedAddressForForm(addressInput.trim());

    if (query.length < 3) {
      searchRequestIdRef.current += 1;
      setResults([]);
      setIsSuggestionOpen(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchPlace({
        openResults: document.activeElement === addressInputRef.current,
        showEmptyError: false,
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [addressInput, locale]);

  useEffect(() => {
    const formElement = containerRef.current?.closest("form") ?? null;

    if (!formElement || !hasCoordinateInput || matchedQuery) {
      return;
    }

    const address = addressInput.trim();
    const city = getFormValue(formElement, "city");
    const currentQuery = getPlaceQuery(
      formatImportedAddressForForm(address),
      city,
    );

    if (currentQuery) {
      setMatchedQuery(currentQuery);
    }
  }, [addressInput, hasCoordinateInput, matchedQuery]);

  return (
    <div ref={containerRef} className="grid gap-3">
      <input name="latitude" type="hidden" value={latitude} />
      <input name="longitude" type="hidden" value={longitude} />

      <div
        className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
        data-field-name="address"
      >
        <span>
          {addressLabel ?? t.address}
          {addressRequired ? (
            <span className="ml-0.5 text-[#D9402F]" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
        <div className="relative">
          <input
            ref={addressInputRef}
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen}
            aria-invalid={Boolean(addressErrors?.length)}
            autoComplete="off"
            className={addressInputClassName ?? fallbackAddressInputClassName}
            name="address"
            placeholder={addressPlaceholder}
            required
            value={addressInput}
            onBlur={() => {
              window.setTimeout(() => setIsSuggestionOpen(false), 120);
            }}
            onChange={handleAddressChange}
            onFocus={() => {
              if (results.length > 0) {
                setIsSuggestionOpen(true);
              }
            }}
          />
          {isSearching ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-moss" />
          ) : hasValidCoordinates ? (
            <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss" />
          ) : null}
          {isSuggestionOpen && results.length > 0 ? (
            <div
              className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-xl border border-[#A7C9A4] bg-white text-sm shadow-[0_18px_42px_rgba(31,73,49,0.16)]"
              role="listbox"
            >
              {results.map((place) => (
                <button
                  key={`${place.latitude}-${place.longitude}-${place.label}`}
                  className="flex w-full items-start gap-2 border-b border-[#E7E3C8] px-3 py-2.5 text-left text-sm font-semibold leading-5 text-zinc-800 transition last:border-b-0 hover:bg-[#F1F8EE]"
                  role="option"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPlace(place)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                  <span className="line-clamp-2">{place.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <FieldError errors={addressErrors} />
        {addressFooter ? <div>{addressFooter}</div> : null}
      </div>

      {hasCoordinateInput ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MapPin className="h-4 w-4 text-moss" />
              {t.placePickerTitle}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <Button
              className="h-9 flex-1 whitespace-nowrap px-3 text-xs sm:flex-none"
              type="button"
              variant="secondary"
              onClick={clearPlace}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              {t.placeClear}
            </Button>
          </div>
        </div>
      ) : null}

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
