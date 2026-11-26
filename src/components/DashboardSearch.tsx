import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark as BookmarkIcon,
  Command,
  HardDriveDownload,
  Search,
  Settings2,
  Wand2,
  X,
} from "lucide-react";
import type { FlatBookmark, Settings, TopSite } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EngineSwitcher from "@/components/EngineSwitcher";
import SiteIcon from "@/components/SiteIcon";
import { findEngine } from "@/lib/engines";
import { useT } from "@/lib/i18n";
import { rankSearchItems } from "@/lib/searchRank";
import { setSettings } from "@/lib/storage";
import { cn, hostnameOf } from "@/lib/utils";

type DashboardTabId = "dashboard" | "cleaner" | "backup" | "settings";

interface HistoryHit {
  url: string;
  title: string;
}

interface SearchCommandItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  url?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  onRun: () => void;
}

interface Props {
  settings: Settings;
  query: string;
  onQueryChange: (query: string) => void;
  bookmarkResults: FlatBookmark[];
  topSites: TopSite[];
}

export default function DashboardSearch({
  settings,
  query,
  onQueryChange,
  bookmarkResults,
  topSites,
}: Props) {
  const t = useT();
  const [historyHits, setHistoryHits] = useState<HistoryHit[]>([]);
  // 默认不展开下拉面板，避免打开新标签页自动聚焦时遮挡下方常驻站点与书签
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeCommand, setActiveCommand] = useState(0);
  const wrapRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const userAgentData = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    return /Mac/i.test(userAgentData?.platform ?? navigator.userAgent);
  }, []);

  const openExternal = useCallback((url: string) => {
    window.open(url, "_blank");
    setPaletteOpen(false);
  }, []);

  const openDashboardTab = useCallback((id: DashboardTabId) => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    params.set("tab", id);
    const next = params.toString();
    window.location.hash = next ? `#${next}` : "#";
    setPaletteOpen(false);
  }, []);

  const runEngineSearch = useCallback(
    (text: string, engineId = settings.searchEngine) => {
      const value = text.trim();
      if (!value) return;
      const engine =
        findEngine(settings, engineId) ?? findEngine(settings, "google");
      if (engine) openExternal(engine.url(value));
    },
    [openExternal, settings],
  );

  useEffect(() => {
    if (!paletteOpen) return;
    const value = query.trim();
    const timer = window.setTimeout(() => {
      chrome.history?.search?.(
        value
          ? { text: value, maxResults: 12 }
          : {
              text: "",
              maxResults: 8,
              startTime: Date.now() - 7 * 86_400_000,
            },
        (results) => {
          setHistoryHits(
            (results ?? [])
              .filter((item) => item.url)
              .slice(0, 6)
              .map((item) => ({
                url: item.url!,
                title: item.title || item.url!,
              })),
          );
        },
      );
    }, 160);
    return () => window.clearTimeout(timer);
  }, [paletteOpen, query]);

  useEffect(() => {
    if (!paletteOpen) return;
    const close = (event: MouseEvent) => {
      if (wrapRef.current?.contains(event.target as Node)) return;
      setPaletteOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [paletteOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setPaletteOpen(true);
      } else if (!isTyping && event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMac]);

  const items = useMemo<SearchCommandItem[]>(() => {
    const value = query.trim();
    const currentEngine =
      findEngine(settings, settings.searchEngine) ??
      findEngine(settings, "google");
    const next: SearchCommandItem[] = [];

    if (value && currentEngine) {
      next.push({
        id: "engine-default",
        title: t("dash.command.searchWith", currentEngine.name, value),
        subtitle: t("dash.command.searchHint"),
        badge: "Enter",
        url: `https://${currentEngine.host}/`,
        onRun: () => runEngineSearch(value),
      });
    }

    for (const bookmark of value ? bookmarkResults.slice(0, 6) : []) {
      const leafFolder = bookmark.path ? bookmark.path.split(" / ").pop() : "";
      next.push({
        id: `bookmark-${bookmark.id}`,
        title: bookmark.title,
        subtitle: leafFolder
          ? `${hostnameOf(bookmark.url)} · ${leafFolder}`
          : hostnameOf(bookmark.url),
        badge: "bookmark",
        url: bookmark.url,
        onRun: () => openExternal(bookmark.url),
      });
    }

    const rankedHistory = value
      ? rankSearchItems(
          value,
          historyHits.map((item, index) => ({
            ...item,
            id: `history-${index}`,
            boost: 18,
          })),
          5,
        ).map(({ item }) => item)
      : historyHits.slice(0, 4);
    for (const history of rankedHistory) {
      next.push({
        id: `history-${history.url}`,
        title: history.title,
        subtitle: hostnameOf(history.url),
        badge: "history",
        url: history.url,
        onRun: () => openExternal(history.url),
      });
    }

    if (value) {
      const rankedSites = rankSearchItems(
        value,
        topSites.map((site, index) => ({
          ...site,
          id: `top-${index}`,
          boost: 12,
        })),
        4,
      ).map(({ item }) => item);
      for (const site of rankedSites) {
        next.push({
          id: `top-${site.url}`,
          title: site.title || hostnameOf(site.url),
          subtitle: hostnameOf(site.url),
          badge: "top site",
          url: site.url,
          onRun: () => openExternal(site.url),
        });
      }
    }

    const actions: SearchCommandItem[] = [
      {
        id: "action-cleaner",
        title: t("dash.command.openCleaner"),
        subtitle: t("dash.command.cleanerHint"),
        badge: "action",
        Icon: Wand2,
        onRun: () => openDashboardTab("cleaner"),
      },
      {
        id: "action-backup",
        title: t("dash.command.openBackup"),
        subtitle: t("dash.command.backupHint"),
        badge: "action",
        Icon: HardDriveDownload,
        onRun: () => openDashboardTab("backup"),
      },
      {
        id: "action-settings",
        title: t("dash.command.openSettings"),
        subtitle: t("dash.command.settingsHint"),
        badge: "action",
        Icon: Settings2,
        onRun: () => openDashboardTab("settings"),
      },
    ];
    next.push(
      ...(value
        ? actions.filter((action) =>
            `${action.title} ${action.subtitle}`
              .toLowerCase()
              .includes(value.toLowerCase()),
          )
        : actions),
    );
    return next.slice(0, value ? 12 : 8);
  }, [bookmarkResults, historyHits, openDashboardTab, openExternal, query, runEngineSearch, settings, t, topSites]);

  useEffect(() => setActiveCommand(0), [items.length, query]);

  const runCommand = (index = activeCommand) => {
    (items[index] ?? items[0])?.onRun();
  };

  return (
    <form
      ref={wrapRef}
      onSubmit={(event) => {
        event.preventDefault();
        runEngineSearch(query);
      }}
      className="relative z-30 mx-auto w-full max-w-[640px] shrink-0"
    >
      <div className="bento-surface group/search relative flex items-center gap-1.5 rounded-2xl p-1.5 transition-all duration-200 focus-within:border-foreground/30 focus-within:ring-4 focus-within:ring-foreground/[0.06]">
        <EngineSwitcher
          settings={settings}
          value={settings.searchEngine}
          onChange={(id) => void setSettings({ searchEngine: id })}
          onOpenChange={(open) => open && setPaletteOpen(false)}
        />
        <span aria-hidden className="h-4 w-px bg-border/80" />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80 transition-colors group-focus-within/search:text-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              onQueryChange(next);
              setPaletteOpen(Boolean(next.trim()));
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (paletteOpen) {
                  setPaletteOpen(false);
                } else if (query) {
                  onQueryChange("");
                } else {
                  inputRef.current?.blur();
                }
              } else if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                items.length
              ) {
                event.preventDefault();
                if (!paletteOpen) {
                  setPaletteOpen(true);
                  return;
                }
                const delta = event.key === "ArrowDown" ? 1 : -1;
                setActiveCommand(
                  (index) => (index + delta + items.length) % items.length,
                );
              } else if (
                event.key === "Enter" &&
                (event.metaKey || event.ctrlKey) &&
                query.trim()
              ) {
                event.preventDefault();
                runEngineSearch(query);
              } else if (event.key === "Enter" && paletteOpen && items.length) {
                event.preventDefault();
                runCommand();
              }
            }}
            placeholder={t("dash.searchPlaceholder")}
            className="h-9 border-0 bg-transparent pl-8 pr-1 text-[13.5px] shadow-none focus-visible:bg-transparent focus-visible:ring-0"
          />
        </div>
        {query ? (
          <button
            type="button"
            aria-label={t("dash.searchClear")}
            title={t("dash.searchClear")}
            onClick={() => {
              onQueryChange("");
              setPaletteOpen(false);
              inputRef.current?.focus();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPaletteOpen((prev) => !prev)}
            className="hidden items-center gap-1 rounded-md px-1 py-0.5 transition hover:opacity-80 sm:inline-flex"
            title={t("dash.quickActions")}
          >
            <kbd className="kbd-cap">{isMac ? "⌘" : "Ctrl"}</kbd>
            <kbd className="kbd-cap">K</kbd>
          </button>
        )}
        <Button
          type="submit"
          size="sm"
          className="h-8 rounded-xl px-3.5 text-xs font-semibold"
          aria-label={t("common.search")}
          title={t("common.search")}
        >
          <span>{t("common.search")}</span>
          <ArrowRight className="h-3.5 w-3.5 opacity-80" />
        </Button>
      </div>
      {paletteOpen && items.length > 0 && (
        <SearchCommandPalette
          items={items}
          activeIndex={activeCommand}
          onActiveChange={setActiveCommand}
          query={query}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </form>
  );
}

function SearchCommandPalette({
  items,
  activeIndex,
  onActiveChange,
  query,
  onClose,
}: {
  items: SearchCommandItem[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  query: string;
  onClose: () => void;
}) {
  const t = useT();
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      className="popover-surface absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/65 bg-muted/45 px-3.5 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Command className="h-3.5 w-3.5 text-foreground/80" />
          {query.trim() ? t("dash.unifiedSearch") : t("dash.quickActions")}
        </span>
        <div className="flex items-center gap-2">
          <span>{t("dash.commandKeyboardHint")}</span>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title={t("common.close")}
            aria-label={t("dash.closeSearchResults")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-[300px] space-y-0.5 overflow-auto p-1.5 scrollbar-thin">
        {items.map((item, index) => {
          const active = activeIndex === index;
          const Icon = item.Icon ?? BookmarkIcon;
          return (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              onMouseEnter={() => onActiveChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={item.onRun}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition duration-100",
                active
                  ? "bg-accent text-foreground ring-1 ring-inset ring-border"
                  : "text-foreground hover:bg-accent/65",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/75 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                {item.url ? (
                  <SiteIcon
                    url={item.url}
                    title={item.title}
                    className="h-4 w-4 text-[8px]"
                  />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-snug">
                  {item.title}
                </span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {item.subtitle}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                  searchBadgeClass(item),
                )}
              >
                {searchBadgeLabel(item, t)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function searchBadgeLabel(
  item: SearchCommandItem,
  translate: (key: string, ...args: string[]) => string,
) {
  if (item.id === "engine-default") return translate("dash.badge.enter");
  if (item.id.startsWith("bookmark-")) return translate("dash.badge.bookmark");
  if (item.id.startsWith("history-")) return translate("dash.badge.history");
  if (item.id.startsWith("top-")) return translate("dash.badge.topSite");
  if (item.id.startsWith("action-")) return translate("dash.badge.action");
  return item.badge;
}

function searchBadgeClass(item: SearchCommandItem) {
  if (item.id === "engine-default")
    return "bg-foreground/10 text-foreground ring-foreground/20";
  if (item.id.startsWith("bookmark-"))
    return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
  if (item.id.startsWith("history-"))
    return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300";
  if (item.id.startsWith("top-"))
    return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";
  return "bg-muted text-muted-foreground ring-border";
}
