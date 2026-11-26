import { useEffect, useMemo, useState } from "react";
import { findFolder, flatten } from "@/lib/bookmarks";
import type { BookmarkNode, FlatBookmark, Settings } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  ChevronRight,
  ExternalLink,
  Folder,
  History as HistoryIcon,
  Search,
  X,
} from "lucide-react";
import { hostnameOf, cn } from "@/lib/utils";
import SiteIcon from "@/components/SiteIcon";
import { useT } from "@/lib/i18n";
import { getSettings, onSettingsChange, setSettings } from "@/lib/storage";
import ThemeToggle from "@/components/ThemeToggle";
import EngineSwitcher from "@/components/EngineSwitcher";
import { findEngine } from "@/lib/engines";
import { rankSearchItems } from "@/lib/searchRank";
import { useBookmarkTree } from "@/hooks/useBookmarkTree";

interface HistoryHit {
  url: string;
  title: string;
}

export default function SidePanel() {
  const t = useT();
  const { tree } = useBookmarkTree();
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [query, setQuery] = useState("");
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [historyHits, setHistoryHits] = useState<HistoryHit[]>([]);
  const [activeResult, setActiveResult] = useState(0);

  useEffect(() => {
    getSettings().then(setSettingsState);
    const off = onSettingsChange(setSettingsState);
    return off;
  }, []);

  const topLevel: BookmarkNode[] = useMemo(() => {
    const roots: BookmarkNode[] = [];
    for (const n of tree) {
      for (const c of n.children ?? []) {
        if (!c.url) roots.push(c);
      }
    }
    return roots;
  }, [tree]);

  const flatSearch: FlatBookmark[] = useMemo(() => {
    if (!query.trim()) return [];
    return rankSearchItems(query, flatten(tree), 300).map(({ item }) => item);
  }, [tree, query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHistoryHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      chrome.history?.search?.({ text: q, maxResults: 20 }, (res) => {
        const items = (res || [])
          .filter((x) => x.url)
          .map((x, index) => ({
            id: `history-${index}`,
            url: x.url!,
            title: x.title || x.url!,
          }));
        setHistoryHits(
          rankSearchItems(q, items, 8).map(({ item }) => ({
            url: item.url,
            title: item.title,
          })),
        );
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => setActiveResult(0), [query]);

  const searchTargets = useMemo(
    () => [
      ...flatSearch.map((item) => ({ url: item.url })),
      ...historyHits.map((item) => ({ url: item.url })),
    ],
    [flatSearch, historyHits],
  );

  const onChangeEngine = async (id: string) => {
    await setSettings({ searchEngine: id });
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const q = query.trim();
    if (!q) return;
    const hit = searchTargets[activeResult] ?? searchTargets[0];
    if (hit) {
      window.open(hit.url, "_blank");
      return;
    }
    const engine = findEngine(settings, settings.searchEngine);
    if (engine) window.open(engine.url(q), "_blank");
  };

  const pinnedFolder = useMemo(() => {
    if (settings?.rootFolderId) {
      const f = findFolder(tree, settings.rootFolderId);
      if (f) return f;
    }
    return topLevel[0];
  }, [tree, settings?.rootFolderId, topLevel]);

  const pinnedBookmarks: FlatBookmark[] = useMemo(() => {
    if (!pinnedFolder) return [];
    const flat = flatten([pinnedFolder], "");
    return flat.slice(0, 12);
  }, [pinnedFolder]);

  const onPickPinned = async (id: string) => {
    await setSettings({ rootFolderId: id });
  };

  const toggleFolder = (id: string) => {
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const linksOf = (n: BookmarkNode): FlatBookmark[] => {
    return (n.children ?? [])
      .filter((c) => !!c.url)
      .map((c) => ({
        id: c.id,
        title: c.title || c.url!,
        url: c.url!,
        path: n.title ?? "",
        dateAdded: c.dateAdded,
      }));
  };

  const subFoldersOf = (n: BookmarkNode): BookmarkNode[] => {
    return (n.children ?? []).filter((c) => !c.url);
  };

  const openFullDashboard = () => {
    const url =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("newtab.html")
        : "/newtab.html";
    window.open(url, "_blank");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/75 bg-background/85 px-3 pb-3 pt-3.5 backdrop-blur-xl">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-foreground text-background shadow-sm">
            <Bookmark className="h-3.5 w-3.5" strokeWidth={2.2} />
          </div>
          <span className="flex-1 truncate text-[13.5px] font-semibold tracking-tight">
            {t("side.title")}
          </span>
          <button
            type="button"
            onClick={openFullDashboard}
            title={t("popup.dashboard")}
            aria-label={t("popup.dashboard")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card/80 text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle variant="icon" className="h-7 w-7" />
        </div>

        <form
          onSubmit={onSubmitSearch}
          className="bento-surface flex items-center gap-1 rounded-xl p-1 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/10"
        >
          {settings && (
            <EngineSwitcher
              settings={settings}
              value={settings.searchEngine}
              onChange={onChangeEngine}
            />
          )}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (
                  (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                  searchTargets.length > 0
                ) {
                  event.preventDefault();
                  const delta = event.key === "ArrowDown" ? 1 : -1;
                  setActiveResult(
                    (index) =>
                      (index + delta + searchTargets.length) %
                      searchTargets.length,
                  );
                } else if (event.key === "Escape" && query) {
                  setQuery("");
                }
              }}
              placeholder={t("side.placeholder")}
              className="h-8 border-0 bg-transparent pl-7 pr-1 text-[13px] shadow-none focus-visible:bg-transparent focus-visible:ring-0"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label={t("dash.searchClear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </header>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {query.trim() ? (
          <SearchResults
            items={flatSearch}
            historyHits={historyHits}
            activeIndex={activeResult}
            onActiveChange={setActiveResult}
          />
        ) : (
          <>
            {pinnedFolder && pinnedBookmarks.length > 0 && (
              <section className="px-3 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] font-semibold text-muted-foreground">
                    {pinnedFolder.title}
                  </span>
                  {topLevel.length > 1 && (
                    <select
                      value={pinnedFolder.id}
                      onChange={(e) => void onPickPinned(e.target.value)}
                      className="h-6 max-w-[140px] rounded-md border border-border/80 bg-card px-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    >
                      {topLevel.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {pinnedBookmarks.map((b) => (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col items-center gap-1"
                      title={`${b.title}\n${b.url}`}
                    >
                      <div className="bento-surface flex h-10 w-10 items-center justify-center rounded-xl transition duration-150 group-hover:-translate-y-0.5 group-hover:border-foreground/30">
                        <SiteIcon
                          url={b.url}
                          title={b.title}
                          className="h-5 w-5 text-[9px]"
                        />
                      </div>
                      <div className="w-full truncate text-center text-[10.5px] font-medium text-foreground/80 group-hover:text-foreground">
                        {b.title}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-4 px-3 pb-4">
              <div className="mb-2 px-0.5 text-[11.5px] font-semibold text-muted-foreground">
                {t("side.bookmarksBar")}
              </div>
              <div className="space-y-1.5">
                {topLevel.map((f) => (
                  <SidepanelFolder
                    key={f.id}
                    folder={f}
                    openedIds={openedIds}
                    onToggle={toggleFolder}
                    linksOf={linksOf}
                    subFoldersOf={subFoldersOf}
                    depth={0}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SidepanelFolder({
  folder,
  openedIds,
  onToggle,
  linksOf,
  subFoldersOf,
  depth,
}: {
  folder: BookmarkNode;
  openedIds: Set<string>;
  onToggle: (id: string) => void;
  linksOf: (n: BookmarkNode) => FlatBookmark[];
  subFoldersOf: (n: BookmarkNode) => BookmarkNode[];
  depth: number;
}) {
  const t = useT();
  const isOpen = openedIds.has(folder.id);
  const links = isOpen ? linksOf(folder) : [];
  const subs = isOpen ? subFoldersOf(folder) : [];
  const count = countAll(folder);

  return (
    <div className={cn(depth === 0 && "bento-surface overflow-hidden rounded-xl")}>
      <button
        onClick={() => onToggle(folder.id)}
        className={cn(
          "flex w-full items-center gap-2.5 text-left transition",
          depth === 0
            ? "px-2.5 py-2 hover:bg-accent/55"
            : "rounded-lg px-2 py-1.5 hover:bg-accent/70",
        )}
        style={depth > 0 ? { paddingLeft: 8 + depth * 10 + "px" } : undefined}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80",
            depth === 0 ? "h-6 w-6" : "h-5 w-5",
          )}
        >
          <Folder className={depth === 0 ? "h-3.5 w-3.5" : "h-3 w-3"} />
        </div>
        <span
          className={cn(
            "flex-1 truncate text-[12.5px]",
            depth === 0 ? "font-medium" : "text-foreground/90",
          )}
        >
          {folder.title || t("dash.untitled")}
        </span>
        <span className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] tabular-nums leading-none text-muted-foreground">
          {count}
        </span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            isOpen && "rotate-90",
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "space-y-0.5",
            depth === 0 ? "border-t border-border/60 bg-muted/20 p-1.5" : "mt-0.5 pl-2",
          )}
        >
          {subs.map((s) => (
            <SidepanelFolder
              key={s.id}
              folder={s}
              openedIds={openedIds}
              onToggle={onToggle}
              linksOf={linksOf}
              subFoldersOf={subFoldersOf}
              depth={depth + 1}
            />
          ))}
          {links.length > 0 && (
            <div className="space-y-0.5">
              {links.slice(0, 80).map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-accent/80"
                  style={depth > 0 ? { paddingLeft: 10 + depth * 10 + "px" } : undefined}
                  title={`${b.title}\n${b.url}`}
                >
                  <SiteIcon
                    url={b.url}
                    title={b.title}
                    size={16}
                    className="h-4 w-4 shrink-0 text-[8px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground/90 group-hover:text-foreground">
                      {b.title}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          {links.length === 0 && subs.length === 0 && (
            <div className="px-2.5 py-1 text-[11px] text-muted-foreground">
              {t("side.emptyFolder")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResults({
  items,
  historyHits,
  activeIndex,
  onActiveChange,
}: {
  items: FlatBookmark[];
  historyHits: HistoryHit[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
}) {
  const t = useT();
  const hasBookmarks = items.length > 0;
  const hasHistory = historyHits.length > 0;
  if (!hasBookmarks && !hasHistory)
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        {t("side.empty")}
      </div>
    );
  return (
    <div className="space-y-3 p-2">
      {hasBookmarks && (
        <div>
          <div className="mb-1 flex items-center gap-1 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Bookmark className="h-3 w-3 text-foreground/80" />
            <span>{t("side.bookmarks")}</span>
          </div>
          <div className="space-y-0.5">
            {items.map((b, index) => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition",
                  activeIndex === index
                    ? "bg-accent ring-1 ring-inset ring-border"
                    : "hover:bg-accent/75",
                )}
                onMouseEnter={() => onActiveChange(index)}
                title={b.url}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
                  <SiteIcon
                    url={b.url}
                    title={b.title}
                    size={16}
                    className="h-4 w-4 text-[8px]"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-foreground">
                    {b.title}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {hostnameOf(b.url)}
                    {b.path ? ` · ${b.path}` : ""}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {hasHistory && (
        <div>
          <div className="mb-1 flex items-center gap-1 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <HistoryIcon className="h-3 w-3 text-amber-500" />
            <span>{t("side.history")}</span>
          </div>
          <div className="space-y-0.5">
            {historyHits.map((h, index) => {
              const resultIndex = items.length + index;
              return (
                <a
                  key={h.url}
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition",
                    activeIndex === resultIndex
                      ? "bg-accent ring-1 ring-inset ring-border"
                      : "hover:bg-accent/75",
                  )}
                  onMouseEnter={() => onActiveChange(resultIndex)}
                  title={h.url}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
                    <SiteIcon
                      url={h.url}
                      title={h.title}
                      size={16}
                      className="h-4 w-4 text-[8px]"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-foreground">
                      {h.title}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {hostnameOf(h.url)}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function countAll(n: BookmarkNode): number {
  if (n.url) return 1;
  return (n.children ?? []).reduce((s, c) => s + countAll(c), 0);
}
