import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getSettings, onSettingsChange, setSettings } from "@/lib/storage";
import type { CustomEngine, Settings } from "@/types";
import { useT } from "@/lib/i18n";
import { BUILTIN_ENGINES } from "@/lib/engines";
import {
  ArrowLeft,
  Check,
  HardDriveDownload,
  Image as ImageIcon,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Plus,
  Search,
  Sun,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SiteIcon from "@/components/SiteIcon";
import { TopSitesSettingsEditor } from "@/components/TopSites";
import Cleaner from "./Cleaner";
import BackupPage from "./Backup";

export type SettingsSectionId =
  | "general"
  | "search"
  | "widgets"
  | "cleaner"
  | "backup";

interface SettingsPageProps {
  section?: SettingsSectionId;
  onSectionChange?: (section: SettingsSectionId) => void;
  onBack?: () => void;
}

/** 规范化壁纸 URL：修复 `https:/x` 之类的少斜杠输入；无法解析的原样保留（如相对路径）。 */
function normalizeWallpaperUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

export default function SettingsPage({
  section: controlledSection,
  onSectionChange,
  onBack,
}: SettingsPageProps) {
  const t = useT();
  const [internalSection, setInternalSection] =
    useState<SettingsSectionId>("general");
  const activeSection = controlledSection ?? internalSection;

  const selectSection = (next: SettingsSectionId) => {
    setInternalSection(next);
    onSectionChange?.(next);
  };

  const [s, setS] = useState<Settings | null>(null);
  const [customEngineName, setCustomEngineName] = useState("");
  const [customEngineUrl, setCustomEngineUrl] = useState("");
  const [customEngineError, setCustomEngineError] = useState("");
  const [wallpaperDraft, setWallpaperDraft] = useState("");

  useEffect(() => {
    getSettings().then((settings) => {
      setS(settings);
      setWallpaperDraft(settings.wallpaper ?? "");
    });
    return onSettingsChange((next) => {
      setS(next);
      setWallpaperDraft(next.wallpaper ?? "");
    });
  }, []);

  // 支持按 Esc 快速返回看板（无打开的 Radix Dialog 时）
  useEffect(() => {
    if (!onBack) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  if (!s) return null;

  const update = async (patch: Partial<Settings>) => {
    const next = await setSettings(patch);
    setS(next);
  };

  const commitWallpaper = (raw: string) => {
    const normalized = normalizeWallpaperUrl(raw);
    if (normalized !== raw) setWallpaperDraft(normalized);
    if (normalized !== (s.wallpaper ?? "")) {
      void update({ wallpaper: normalized || undefined });
    }
  };

  const addCustomEngine = async () => {
    const name = customEngineName.trim();
    const url = customEngineUrl.trim();
    if (!name || !url) {
      setCustomEngineError(t("settings.customEngineRequired"));
      return;
    }
    if (!/^https?:\/\//i.test(url) || !url.includes("%s")) {
      setCustomEngineError(t("settings.customEngineUrlInvalid"));
      return;
    }
    const engine: CustomEngine = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      url,
    };
    await update({ customEngines: [...(s.customEngines ?? []), engine] });
    setCustomEngineName("");
    setCustomEngineUrl("");
    setCustomEngineError("");
  };

  const removeCustomEngine = async (id: string) => {
    const customEngines = (s.customEngines ?? []).filter(
      (engine) => engine.id !== id,
    );
    await update({
      customEngines,
      ...(s.searchEngine === id ? { searchEngine: "google" } : {}),
    });
  };

  const preferenceNav = [
    { id: "general" as const, icon: Palette, label: t("settings.nav.general") },
    { id: "search" as const, icon: Search, label: t("settings.nav.search") },
    { id: "widgets" as const, icon: LayoutGrid, label: t("settings.nav.widgets") },
  ];

  const dataNav = [
    { id: "cleaner" as const, icon: Wand2, label: t("settings.nav.cleaner") },
    { id: "backup" as const, icon: HardDriveDownload, label: t("settings.nav.backup") },
  ];

  return (
    <div className="mx-auto flex h-full max-w-[1140px] flex-col gap-4 lg:grid lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-5">
      {/* 左侧分类导航侧栏 */}
      <aside className="flex shrink-0 flex-col gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bento-surface group inline-flex h-10 w-full items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium text-foreground transition hover:border-foreground/30 hover:bg-accent/55"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-foreground" />
            <span>{t("settings.backToBoard")}</span>
            <kbd className="kbd-cap ml-auto hidden lg:inline-flex">Esc</kbd>
          </button>
        )}

        {/* 移动端水平导航 */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...preferenceNav, ...dataNav].map(({ id, icon: Icon, label }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectSection(id)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition",
                  active
                    ? "border-foreground/35 bg-card text-foreground shadow-sm"
                    : "border-border/75 bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 桌面端分组侧栏 */}
        <Card className="hidden p-2.5 lg:block">
          <div className="px-2 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("settings.group.preferences")}
          </div>
          <nav className="space-y-0.5">
            {preferenceNav.map(({ id, icon: Icon, label }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSection(id)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] transition",
                    active
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-foreground/85 hover:bg-accent/70",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-85" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="my-2.5 h-px bg-border/65" />

          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("settings.group.data")}
          </div>
          <nav className="space-y-0.5">
            {dataNav.map(({ id, icon: Icon, label }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSection(id)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] transition",
                    active
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-foreground/85 hover:bg-accent/70",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-85" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </Card>
      </aside>

      {/* 右侧独立滚动内容工作区 */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 pb-6 scrollbar-thin">
        {activeSection === "general" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle>{t("settings.nav.general")}</CardTitle>
                <CardDescription>{t("settings.appearanceHint")}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/60 pt-0">
                <SettingActionRow
                  title={t("settings.theme")}
                  description={t("settings.themeDesc")}
                >
                  <div className="inline-flex rounded-xl border border-border/80 bg-muted/60 p-1">
                    {(
                      [
                        ["system", Monitor, t("settings.themeAuto")],
                        ["light", Sun, t("settings.themeLight")],
                        ["dark", Moon, t("settings.themeDark")],
                      ] as const
                    ).map(([v, Icon, label]) => {
                      const active = s.theme === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => void update({ theme: v as Settings["theme"] })}
                          className={cn(
                            "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                            active
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SettingActionRow>

                <SettingActionRow
                  title={t("settings.density")}
                  description={t("settings.densityDesc")}
                >
                  <div className="inline-flex rounded-xl border border-border/80 bg-muted/60 p-1">
                    {(
                      [
                        ["comfy", t("settings.densityComfy")],
                        ["compact", t("settings.densityCompact")],
                      ] as const
                    ).map(([v, label]) => {
                      const active = s.cardDensity === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            void update({ cardDensity: v as Settings["cardDensity"] })
                          }
                          className={cn(
                            "inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition",
                            active
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </SettingActionRow>

                <SettingActionRow
                  title={t("settings.language")}
                  description={t("settings.languageDesc")}
                >
                  <div className="inline-flex rounded-xl border border-border/80 bg-muted/60 p-1">
                    {(
                      [
                        ["auto", "Auto"],
                        ["zh", t("settings.languageChinese")],
                        ["en", "English"],
                      ] as const
                    ).map(([v, label]) => {
                      const active = s.language === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            void update({ language: v as Settings["language"] })
                          }
                          className={cn(
                            "inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition",
                            active
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </SettingActionRow>

                <div className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-foreground">
                        {t("settings.wallpaper")}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("settings.wallpaperDesc")}
                      </div>
                      <div className="relative mt-2.5 flex items-center">
                        <Input
                          placeholder={t("settings.wallpaperPh")}
                          value={wallpaperDraft}
                          onChange={(event) => setWallpaperDraft(event.target.value)}
                          onBlur={() => commitWallpaper(wallpaperDraft)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          className={wallpaperDraft ? "pr-8" : undefined}
                        />
                        {wallpaperDraft && (
                          <button
                            type="button"
                            title={t("dash.searchClear")}
                            aria-label={t("dash.searchClear")}
                            onClick={() => {
                              setWallpaperDraft("");
                              void update({ wallpaper: undefined });
                            }}
                            className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 紧凑壁纸预览窗 */}
                    <div className="flex h-[74px] w-[124px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/45">
                      {s.wallpaper ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${JSON.stringify(s.wallpaper)})`,
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "search" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle>{t("settings.nav.search")}</CardTitle>
                <CardDescription>{t("settings.searchHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div>
                  <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                    {t("settings.defaultEngine")}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {BUILTIN_ENGINES.map((e) => {
                      const active = s.searchEngine === e.id;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => void update({ searchEngine: e.id })}
                          className={cn(
                            "flex h-10 items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-medium transition",
                            active
                              ? "border-foreground/45 bg-accent text-foreground shadow-sm ring-1 ring-foreground/10"
                              : "border-border/80 bg-background/65 text-foreground/85 hover:border-border hover:bg-accent/55",
                          )}
                        >
                          <SiteIcon
                            url={`https://${e.host}/`}
                            title={e.name}
                            className="h-4 w-4 shrink-0 text-[9px]"
                          />
                          <span className="flex-1 truncate">{e.name}</span>
                          {active && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                    {t("settings.customEngines")}
                  </div>
                  <div className="space-y-3">
                    {(s.customEngines ?? []).length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {s.customEngines.map((engine) => {
                          const active = s.searchEngine === engine.id;
                          return (
                            <div
                              key={engine.id}
                              className="flex items-center gap-2.5 rounded-xl border border-border/75 bg-background/65 px-3 py-2"
                            >
                              <SiteIcon
                                url={engine.url}
                                title={engine.name}
                                className="h-4 w-4 shrink-0 text-[9px]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12.5px] font-medium">
                                  {engine.name}
                                </div>
                                <div className="truncate text-[10.5px] text-muted-foreground">
                                  {engine.url}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-7 px-2 text-xs"
                                onClick={() => void update({ searchEngine: engine.id })}
                              >
                                {active ? t("common.done") : t("common.confirm")}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title={t("common.delete")}
                                onClick={() => void removeCustomEngine(engine.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 p-2.5 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_auto]">
                      <Input
                        value={customEngineName}
                        onChange={(event) => {
                          setCustomEngineName(event.target.value);
                          setCustomEngineError("");
                        }}
                        placeholder={t("settings.customEngineName")}
                      />
                      <Input
                        value={customEngineUrl}
                        onChange={(event) => {
                          setCustomEngineUrl(event.target.value);
                          setCustomEngineError("");
                        }}
                        placeholder="https://example.com/search?q=%s"
                      />
                      <Button
                        type="button"
                        variant="default"
                        className="gap-1.5"
                        onClick={addCustomEngine}
                      >
                        <Plus className="h-4 w-4" />
                        {t("common.add")}
                      </Button>
                    </div>
                    <p
                      className={cn(
                        "text-xs",
                        customEngineError
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {customEngineError || t("settings.customEngineHint")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "widgets" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t("settings.nav.widgets")}</CardTitle>
                    <CardDescription className="mt-1">
                      {t("settings.showTopSitesHint")}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={s.showTopSites ?? true}
                    onCheckedChange={(v) => void update({ showTopSites: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TopSitesSettingsEditor
                  sites={s.topSites ?? []}
                  onChange={(topSites) => update({ topSites })}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "cleaner" && <Cleaner />}

        {activeSection === "backup" && <BackupPage />}
      </div>
    </div>
  );
}

function SettingActionRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
