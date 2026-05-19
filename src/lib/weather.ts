import type { WeatherLocation } from "@/types";

const WEATHER_CACHE_KEY = "smart-bookmark::weather-cache";
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

const hasChromeStorage =
  typeof chrome !== "undefined" && !!chrome.storage?.local;

interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    country?: string;
    admin1?: string;
    admin2?: string;
    timezone: string;
    latitude: number;
    longitude: number;
  }>;
}

interface ForecastResponse {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

interface WeatherCacheRecord {
  locationKey: string;
  fetchedAt: number;
  forecast: WeatherForecast;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainChance: number;
  windSpeedMax: number;
}

export interface WeatherForecast {
  current: {
    updatedAt: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
    isDay: boolean;
  };
  days: WeatherDay[];
}

function getLocationKey(location: WeatherLocation) {
  return `${location.id}:${location.latitude}:${location.longitude}:${location.timezone}`;
}

async function readLocal<T>(key: string): Promise<T | undefined> {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
  }
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
}

async function writeLocal<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function toLocation(item: NonNullable<GeocodingResponse["results"]>[number]): WeatherLocation {
  return {
    id: item.id,
    name: item.name,
    country: item.country ?? "",
    admin1: item.admin1,
    admin2: item.admin2,
    timezone: item.timezone,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

function toForecast(data: ForecastResponse): WeatherForecast {
  if (!data.current || !data.daily) {
    throw new Error("天气服务返回了不完整的数据");
  }

  const days = data.daily.time.map((date, index) => ({
    date,
    weatherCode: data.daily?.weather_code[index] ?? 0,
    tempMax: data.daily?.temperature_2m_max[index] ?? 0,
    tempMin: data.daily?.temperature_2m_min[index] ?? 0,
    rainChance: data.daily?.precipitation_probability_max[index] ?? 0,
    windSpeedMax: data.daily?.wind_speed_10m_max[index] ?? 0,
  }));

  return {
    current: {
      updatedAt: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      isDay: data.current.is_day === 1,
    },
    days,
  };
}

async function fetchForecast(location: WeatherLocation): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    forecast_days: "7",
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("天气服务暂时不可用");
  }

  const json = (await response.json()) as ForecastResponse;
  return toForecast(json);
}

export async function searchWeatherLocations(query: string): Promise<WeatherLocation[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const params = new URLSearchParams({
    name: text,
    count: "8",
    language: "zh",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("地点搜索失败");
  }

  const json = (await response.json()) as GeocodingResponse;
  return (json.results ?? []).map(toLocation);
}

export async function getWeatherForecast(
  location: WeatherLocation,
  force = false,
): Promise<{ forecast: WeatherForecast; fromCache: boolean }> {
  const locationKey = getLocationKey(location);
  const cached = await readLocal<WeatherCacheRecord>(WEATHER_CACHE_KEY);
  const hasFreshCache =
    cached &&
    cached.locationKey === locationKey &&
    Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL_MS;

  if (!force && hasFreshCache) {
    return { forecast: cached.forecast, fromCache: true };
  }

  try {
    const forecast = await fetchForecast(location);
    await writeLocal<WeatherCacheRecord>(WEATHER_CACHE_KEY, {
      locationKey,
      fetchedAt: Date.now(),
      forecast,
    });
    return { forecast, fromCache: false };
  } catch (error) {
    if (cached && cached.locationKey === locationKey) {
      return { forecast: cached.forecast, fromCache: true };
    }
    throw error;
  }
}

export function formatWeatherLocation(location: WeatherLocation): string {
  return [location.name, location.admin2, location.admin1, location.country]
    .filter(Boolean)
    .join(" · ");
}
