import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenMeteoForecast } from "@/features/weather/openMeteo";
import { isWeatherDateInForecastWindow } from "@/features/weather/activityWeather";

export const runtime = "nodejs";

const forecastRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.coerce.number().finite().optional(),
  locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN"),
  locationQuery: z.string().trim().max(240).optional(),
  longitude: z.coerce.number().finite().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = forecastRequestSchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!payload.success || !isWeatherDateInForecastWindow(payload.data.date)) {
    return NextResponse.json(
      {
        error: "INVALID_WEATHER_REQUEST",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const forecast = await getOpenMeteoForecast(payload.data);

    if (!forecast) {
      return NextResponse.json({
        forecast: null,
      });
    }

    return NextResponse.json({
      forecast,
    });
  } catch (error) {
    console.error("Failed to load activity weather forecast", error);

    return NextResponse.json(
      {
        error: "WEATHER_UNAVAILABLE",
      },
      {
        status: 502,
      },
    );
  }
}
