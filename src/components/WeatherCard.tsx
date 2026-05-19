import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setSettings } from "@/lib/storage";
import {
  formatWeatherLocation,
  getWeatherForecast,
  searchWeatherLocations,
} from "@/lib/weather";
import type { WeatherForecast } from "@/lib/weather";
import type { WeatherLocation } from "@/types";
import { toast } from "@/components/ui/toast";

interface Props {
  location?: WeatherLocation;
}

function getWeatherVisual(weatherCode: number, isDay: boolean) {
  if (weatherCode === 0) {
    return {
      label: "晴朗",
      Icon: isDay ? Sun : CloudMoon,
      tone: "text-amber-500 dark:text-amber-300",
      bg: "from-amber-500/15 to-orange-500/15",
    };
  }

  if ([1, 2].includes(weatherCode)) {
    return {
      label: "少云",
      Icon: isDay ? CloudSun : CloudMoon,
      tone: "text-sky-600 dark:text-sky-300",
      bg: "from-sky-500/15 to-cyan-500/15",
    };
  }

  if (weatherCode === 3) {
    return {
      label: "阴天",
      Icon: Cloud,
      tone: "text-slate-600 dark:text-slate-300",
      bg: "from-slate-500/15 to-slate-400/15",
    };
  }

  if ([45, 48].includes(weatherCode)) {
    return {
      label: "有雾",
      Icon: CloudFog,
      tone: "text-slate-500 dark:text-slate-300",
      bg: "from-slate-500/15 to-zinc-500/15",
    };
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return {
      label: "毛毛雨",
      Icon: CloudDrizzle,
      tone: "text-cyan-600 dark:text-cyan-300",
      bg: "from-cyan-500/15 to-sky-500/15",
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return {
      label: "下雨",
      Icon: CloudRain,
      tone: "text-blue-600 dark:text-blue-300",
      bg: "from-blue-500/15 to-cyan-500/15",
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return {
      label: "下雪",
      Icon: CloudSnow,
      tone: "text-cyan-700 dark:text-cyan-200",
      bg: "from-cyan-500/15 to-slate-500/15",
    };
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return {
      label: "雷雨",
      Icon: CloudLightning,
      tone: "text-violet-600 dark:text-violet-300",
      bg: "from-violet-500/15 to-indigo-500/15",
    };
  }

  return {
    label: "多云",
    Icon: Cloud,
    tone: "text-slate-600 dark:text-slate-300",
    bg: "from-slate-500/15 to-slate-400/15",
  };
}

function formatDayLabel(date: string, index: number) {
  if (index === 0) return "今天";
  if (index === 1) return "明天";
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatClock(dateTime: string) {
  const time = dateTime.split("T")[1] ?? "";
  return time.slice(0, 5);
}

function SearchResult({
  item,
  onSelect,
}: {
  item: WeatherLocation;
  onSelect: (item: WeatherLocation) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-accent/60"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/15 to-cyan-500/15 text-sky-600 dark:text-sky-300">
          <MapPin className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {item.name}
          </div>
          <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            {[item.admin2, item.admin1, item.country].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function WeatherCard({ location }: Props) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorText, setErrorText] = useState("");

  const currentVisual = useMemo(() => {
    if (!forecast) return null;
    return getWeatherVisual(
      forecast.current.weatherCode,
      forecast.current.isDay,
    );
  }, [forecast]);

  const locationMeta = useMemo(() => {
    if (!location) return "";
    return (
      [location.admin2, location.admin1, location.country]
        .filter(Boolean)
        .join(" · ") || formatWeatherLocation(location)
    );
  }, [location]);

  useEffect(() => {
    if (!dialogOpen) return;
    setQuery(location?.name ?? "");
    setResults([]);
    setSearched(false);
  }, [dialogOpen, location]);

  useEffect(() => {
    if (!location) {
      setForecast(null);
      setErrorText("");
      return;
    }

    const currentLocation = location;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorText("");
      try {
        const result = await getWeatherForecast(currentLocation);
        if (!cancelled) {
          setForecast(result.forecast);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(
            error instanceof Error ? error.message : "天气加载失败",
          );
          setForecast(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [location]);

  async function refreshForecast() {
    if (!location) {
      setDialogOpen(true);
      return;
    }

    setRefreshing(true);
    try {
      const result = await getWeatherForecast(location, true);
      setForecast(result.forecast);
      setErrorText("");
      toast("天气已刷新", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "天气刷新失败",
        "error",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const text = query.trim();
    if (text.length < 2) {
      toast("请至少输入两个字", "error");
      return;
    }

    setSearching(true);
    setSearched(true);
    try {
      const next = await searchWeatherLocations(text);
      setResults(next);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "地点搜索失败",
        "error",
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function chooseLocation(next: WeatherLocation) {
    try {
      await setSettings({ weatherLocation: next });
      setDialogOpen(false);
      toast("天气地点已更新", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "天气地点保存失败",
        "error",
      );
    }
  }

  const today = forecast?.days[0];

  return (
    <>
      <Card className="overflow-hidden border-border/70 bg-card/95 p-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
              currentVisual?.bg ?? "from-sky-500/15 to-cyan-500/15"
            }`}
          >
            {currentVisual ? (
              <currentVisual.Icon className={`h-5 w-5 ${currentVisual.tone}`} />
            ) : (
              <CloudSun className="h-5 w-5 text-sky-600 dark:text-sky-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold tracking-tight">
                天气
              </div>
              {location && (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="truncate rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  {location.name}
                </button>
              )}
            </div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              {location
                ? locationMeta
                : "还没有选择地点"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => setDialogOpen(true)}
              title="选择地点"
            >
              <MapPin className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => void refreshForecast()}
              title="刷新天气"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {!location && (
          <div className="mt-3 rounded-2xl border border-dashed border-border/80 bg-background/60 px-3 py-4 text-center">
            <div className="text-sm font-medium text-foreground">
              选择一个常用地点
            </div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              支持城市、区县和邮编搜索，保存后会显示 7 天天气。
            </div>
            <Button
              type="button"
              className="mt-3 h-8 rounded-xl px-3 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              现在选择
            </Button>
          </div>
        )}

        {location && loading && !forecast && (
          <div className="mt-3 space-y-2">
            <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
          </div>
        )}

        {location && errorText && !forecast && (
          <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-4 text-sm text-destructive">
            {errorText}
          </div>
        )}

        {location && forecast && currentVisual && today && (
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-background/75 p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-semibold leading-none tracking-tight">
                      {Math.round(forecast.current.temperature)}°
                    </span>
                    <span className={`pb-1 text-sm font-medium ${currentVisual.tone}`}>
                      {currentVisual.label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                    <span>体感 {Math.round(forecast.current.apparentTemperature)}°</span>
                    <span>最高 {Math.round(today.tempMax)}°</span>
                    <span>最低 {Math.round(today.tempMin)}°</span>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/70 px-2 py-1 text-[10.5px] font-medium text-muted-foreground">
                  更新于 {formatClock(forecast.current.updatedAt)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-muted/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    湿度
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {Math.round(forecast.current.humidity)}%
                  </div>
                </div>
                <div className="rounded-xl bg-muted/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <Wind className="h-3.5 w-3.5" />
                    风速
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {Math.round(forecast.current.windSpeed)} km/h
                  </div>
                </div>
                <div className="rounded-xl bg-muted/60 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <Thermometer className="h-3.5 w-3.5" />
                    降水
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {Math.round(today.rainChance)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/75 p-2">
              <div className="mb-1 flex items-center justify-between px-1.5 py-1">
                <div className="text-xs font-semibold tracking-tight text-foreground">
                  未来 7 天
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  降水概率 / 最高最低温
                </div>
              </div>
              <div className="space-y-1">
                {forecast.days.map((day, index) => {
                  const itemVisual = getWeatherVisual(
                    day.weatherCode,
                    forecast.current.isDay,
                  );
                  return (
                    <div
                      key={day.date}
                      className="grid grid-cols-[54px_24px_minmax(0,1fr)_56px_70px] items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-muted/55"
                    >
                      <div className="text-[11.5px] font-medium text-foreground">
                        {formatDayLabel(day.date, index)}
                      </div>
                      <itemVisual.Icon className={`h-4 w-4 ${itemVisual.tone}`} />
                      <div className="truncate text-[11.5px] text-muted-foreground">
                        {itemVisual.label}
                      </div>
                      <div className="text-right text-[11.5px] text-muted-foreground">
                        雨 {Math.round(day.rainChance)}%
                      </div>
                      <div className="text-right text-[11.5px] font-medium text-foreground">
                        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>选择天气地点</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              输入城市、区县或邮编，从候选结果中选一个保存到首页天气卡。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => void submitSearch(event)} className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：上海、深圳、杭州、10001"
                className="h-10"
              />
              <Button
                type="submit"
                className="h-10 rounded-xl px-4"
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
              {results.map((item) => (
                <SearchResult
                  key={`${item.id}-${item.latitude}-${item.longitude}`}
                  item={item}
                  onSelect={chooseLocation}
                />
              ))}

              {searched && !searching && results.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-3 py-5 text-center">
                  <div className="text-sm font-medium text-foreground">
                    没有找到匹配地点
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">
                    试试更短的地名、区县名，或者输入邮编。
                  </div>
                </div>
              )}
            </div>
          </form>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
