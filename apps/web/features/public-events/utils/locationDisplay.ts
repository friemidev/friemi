import { getGoogleMapsSearchUrl } from "../../maps/googleMaps";

type PublicEventLocationInput = {
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

type PublicEventLocationLocale = "zh-CN" | "en" | "fr";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getLocale(locale: string): PublicEventLocationLocale {
  if (locale === "en" || locale === "fr") {
    return locale;
  }

  return "zh-CN";
}

function hasCoordinates(event: PublicEventLocationInput) {
  return event.latitude !== null && event.longitude !== null;
}

export function isGenericPublicEventAddress(
  event: PublicEventLocationInput,
) {
  const address = normalizeText(event.address);
  const city = normalizeText(event.city);

  if (!address) {
    return true;
  }

  return (
    address === city ||
    address === "paris" ||
    address === "paris, france" ||
    address === "paris france" ||
    address === "france"
  );
}

export function getPublicEventMapUrl({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    getGoogleMapsSearchUrl({
      latitude,
      longitude,
    }) ?? ""
  );
}

function getFallbackLabels(locale: string) {
  const normalizedLocale = getLocale(locale);

  if (normalizedLocale === "en") {
    return {
      coordinateLabel: "Map coordinates",
      genericWithMap: "Map pin available; exact address depends on the official page",
      genericWithoutMap: "Exact address depends on the official page",
      mapLabel: "Map",
      sourceAddressLabel: "Source address",
    };
  }

  if (normalizedLocale === "fr") {
    return {
      coordinateLabel: "Coordonnees carte",
      genericWithMap:
        "Point carte disponible ; adresse exacte selon la page officielle",
      genericWithoutMap: "Adresse exacte selon la page officielle",
      mapLabel: "Carte",
      sourceAddressLabel: "Adresse source",
    };
  }

  return {
    coordinateLabel: "地图坐标",
    genericWithMap: "地图定位可用，具体地址以官方页面为准",
    genericWithoutMap: "具体地址以官方页面为准",
    mapLabel: "地图",
    sourceAddressLabel: "来源地址",
  };
}

export function getPublicEventLocationDisplay(
  event: PublicEventLocationInput,
  locale: string,
) {
  const labels = getFallbackLabels(locale);
  const genericAddress = isGenericPublicEventAddress(event);

  if (!genericAddress) {
    return {
      copyValue: event.address,
      displayLabel: event.address,
      isGenericAddress: false,
      mapAddress: event.address,
    };
  }

  if (!hasCoordinates(event)) {
    return {
      copyValue: labels.genericWithoutMap,
      displayLabel: labels.genericWithoutMap,
      isGenericAddress: true,
      mapAddress: labels.genericWithoutMap,
    };
  }

  const latitude = event.latitude;
  const longitude = event.longitude;

  if (latitude === null || longitude === null) {
    return {
      copyValue: labels.genericWithoutMap,
      displayLabel: labels.genericWithoutMap,
      isGenericAddress: true,
      mapAddress: labels.genericWithoutMap,
    };
  }

  const mapUrl = getPublicEventMapUrl({ latitude, longitude });
  const coordinateValue = `${latitude}, ${longitude}`;

  return {
    copyValue: [
      labels.genericWithMap,
      `${labels.sourceAddressLabel}: ${event.address}`,
      `${labels.coordinateLabel}: ${coordinateValue}`,
      `${labels.mapLabel}: ${mapUrl}`,
    ].join("\n"),
    displayLabel: labels.genericWithMap,
    isGenericAddress: true,
    mapAddress: `${labels.genericWithMap} (${coordinateValue})`,
  };
}
