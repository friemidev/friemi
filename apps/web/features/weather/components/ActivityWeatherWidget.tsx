"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  LoaderCircle,
  Snowflake,
  Sun,
  ThermometerSun,
  Umbrella,
  Wind,
} from "lucide-react";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { WeatherForecast } from "../openMeteo";

type ActivityWeatherWidgetProps = {
  className?: string;
  date: string;
  latitude: number | null;
  locale: string;
  locationQuery: string | null;
  longitude: number | null;
};

type WeatherState =
  | { status: "loading" }
  | { forecast: WeatherForecast; status: "ready" }
  | { status: "unavailable" };

function formatTemperature(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}°`;
}

function formatNumber(value: number | null, unit: string) {
  return value === null ? "--" : `${Math.round(value)}${unit}`;
}

function getWeatherIcon(code: number | null) {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return CloudDrizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return Snowflake;
  if ([95, 96, 99].includes(code ?? -1)) return CloudLightning;
  return CloudSun;
}

function getWeatherConditionKey(code: number | null) {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return "snow";
  if ([95, 96, 99].includes(code ?? -1)) return "thunderstorm";
  return "unknown";
}

export function ActivityWeatherWidget({
  className,
  date,
  latitude,
  locale,
  locationQuery,
  longitude,
}: ActivityWeatherWidgetProps) {
  const t = getCopy(locale).weather;
  const [state, setState] = useState<WeatherState>({ status: "loading" });
  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      date,
      locale,
    });

    if (latitude !== null) {
      params.set("latitude", String(latitude));
    }

    if (longitude !== null) {
      params.set("longitude", String(longitude));
    }

    if (locationQuery) {
      params.set("locationQuery", locationQuery);
    }

    return `/api/weather/forecast?${params.toString()}`;
  }, [date, latitude, locale, locationQuery, longitude]);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: "loading" });

    fetch(requestUrl, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("WEATHER_UNAVAILABLE");
        }

        return (await response.json()) as { forecast?: WeatherForecast };
      })
      .then((payload) => {
        if (payload.forecast) {
          setState({
            forecast: payload.forecast,
            status: "ready",
          });
          return;
        }

        setState({ status: "unavailable" });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.warn("Failed to render weather widget", error);
        setState({ status: "unavailable" });
      });

    return () => controller.abort();
  }, [requestUrl]);

  if (state.status === "loading") {
    return (
      <section
        className={cn(
          "rounded-[1.1rem] border border-[#d8ccb4] bg-white/72 p-3 shadow-sm sm:p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#8aa5a0]" />
          {t.loading}
        </div>
        <div className="mt-3 h-12 rounded-xl bg-gradient-to-r from-[#f3ecde] via-white to-[#e8f1ef]" />
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section
        className={cn(
          "rounded-[1.1rem] border border-[#ead9bd] bg-white/58 p-3 text-sm text-zinc-500 sm:p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-[#8aa5a0]" />
          <span>{t.unavailable}</span>
        </div>
      </section>
    );
  }

  const { forecast } = state;
  const Icon = getWeatherIcon(forecast.weatherCode);
  const conditionKey = getWeatherConditionKey(forecast.weatherCode);
  const conditionLabel = t.conditions[conditionKey] ?? t.conditions.unknown;

  return (
    <section
      className={cn(
        "rounded-[1.1rem] border border-[#d8ccb4] bg-[#f9f4ea] p-3 text-sm text-zinc-700 shadow-sm sm:p-4",
        className,
      )}
      aria-label={t.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Icon className="h-4 w-4 text-[#7f9e97]" />
            {t.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {forecast.locationLabel || t.locationFallback}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#6f5434] ring-1 ring-[#dccba8]">
          {date.slice(5)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/76 p-3 ring-1 ring-[#ead9bd]">
        <div>
          <p className="text-xs font-medium text-zinc-500">{conditionLabel}</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal text-ink">
            {formatTemperature(forecast.temperatureMin)} /{" "}
            {formatTemperature(forecast.temperatureMax)}
          </p>
        </div>
        <ThermometerSun className="h-8 w-8 shrink-0 text-[#d88d72]" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/60 px-3 py-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-600">
            <Umbrella className="h-3.5 w-3.5" />
            {t.rain}
          </div>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatNumber(forecast.precipitationProbabilityMax, "%")}
          </p>
        </div>
        <div className="rounded-xl bg-white/60 px-3 py-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-600">
            <Wind className="h-3.5 w-3.5" />
            {t.wind}
          </div>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatNumber(forecast.windSpeedMax, " km/h")}
          </p>
        </div>
      </div>
    </section>
  );
}
