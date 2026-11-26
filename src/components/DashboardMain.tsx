import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  GripVertical,
  LayoutGrid,
  MoreHorizontal,
  Pin,
  Rows3,
  X,
} from "lucide-react";
import type { BookmarkNode, FlatBookmark, Settings, TopSite } from "@/types";
import type { MenuAnchor } from "@/components/BookmarkCtxMenu";
import DashboardSearch from "@/components/DashboardSearch";
import FolderTree from "@/components/FolderTree";
import SiteIcon from "@/components/SiteIcon";
import TopSites from "@/components/TopSites";
import { useT } from "@/lib/i18n";
import { setSettings } from "@/lib/storage";
import { cn, hostnameOf } from "@/lib/utils";

interface Props {
  tree: BookmarkNode[];
  expanded: Set<string>;
  pinnedIds: Set<string>;
  settings: Settings;
  selected: string;
  pinnedFolders: BookmarkNode[];
  rootFolders: BookmarkNode[];
  query: string;
  onQueryChange: (query: string) => void;
  filtered: FlatBookmark[];
  subFolders: BookmarkNode[];
  breadcrumb: Array<{ id: string; title: string }>;
  greeting: string;
  showHero: boolean;
  topSites: TopSite[];
  showTopSites: boolean;
  page: number;
  canReorder: boolean;
  dragId: string | null;
  overId: string | null;
  defaultFolderParentId: string;
  onSelectFolder: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onTogglePin: (id: string) => void;
  onTopSitesChange: (sites: TopSite[]) => void | Promise<void>;
  onHideTopSites: () => void | Promise<void>;
  onCreateFolder: (parentId: string) => void;
  onFolderContextMenu: (
    folder: { id: string; title: string; parentId?: string },
    event: React.MouseEvent,
  ) => void;
  onPageChange: (page: number) => void;
  onDragStart: (event: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent, id: string) => void;
  onDrop: (event: React.DragEvent, id: string) => void;
  onBookmarkContext: (bookmark: FlatBookmark, anchor: MenuAnchor) => void;
}

function countSubBookmarks(node: BookmarkNode): number {
  if (node.url) return 1;
  return (node.children ?? []).reduce((sum, child) => sum + countSubBookmarks(child), 0);
}

export default function DashboardMain(props: Props) {
  const t = useT();
  const hasTopSites = props.showTopSites && props.topSites.length > 0;
  const isCompact = props.settings.cardDensity === "compact";

  const [treePopoverOpen, setTreePopoverOpen] = useState(false);
  const treePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!treePopoverOpen) return;
    const onOutside = (event: MouseEvent) => {
      if (treePopoverRef.current?.contains(event.target as Node)) return;
      setTreePopoverOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTreePopoverOpen(false);
    };
    window.addEventListener("click", onOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("click", onOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [treePopoverOpen]);

  // 汇总顶栏快捷文件夹胶囊（去重：置顶目录优先，随后是一级目录）
  const quickFolders = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ folder: BookmarkNode; pinned: boolean; count: number }> = [];
    for (const folder of props.pinnedFolders) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      list.push({ folder, pinned: true, count: countSubBookmarks(folder) });
    }
    for (const folder of props.rootFolders) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      list.push({ folder, pinned: false, count: countSubBookmarks(folder) });
    }
    return list;
  }, [props.pinnedFolders, props.rootFolders]);

  const totalAllCount = useMemo(
    () => props.tree.reduce((sum, node) => sum + countSubBookmarks(node), 0),
    [props.tree],
  );

  // 当前若深入了非顶层/非置顶的子文件夹，作为临时激活胶囊展示在胶囊栏内
  const activeDeepFolder = useMemo(() => {
    if (!props.selected) return null;
    if (quickFolders.some((q) => q.folder.id === props.selected)) return null;
    const lastCrumb = props.breadcrumb[props.breadcrumb.length - 1];
    return lastCrumb ? { id: lastCrumb.id, title: lastCrumb.title } : null;
  }, [props.breadcrumb, props.selected, quickFolders]);

  const stageRef = useRef<HTMLDivElement>(null);
  const wheelAccumRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);

  const [gridSpec, setGridSpec] = useState({ cols: 5, rows: 6 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const computeGrid = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      const minColWidth = isCompact ? 196 : 240;
      const itemHeight = isCompact ? 44 : 56;
      const gap = isCompact ? 8 : 10;

      const cols = Math.max(1, Math.floor((width + gap) / (minColWidth + gap)));
      const rows = Math.max(1, Math.floor((height + gap) / (itemHeight + gap)));

      setGridSpec((prev) =>
        prev.cols === cols && prev.rows === rows ? prev : { cols, rows },
      );
    };

    computeGrid();
    const ro = new ResizeObserver(computeGrid);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isCompact, props.showHero, hasTopSites, props.selected, props.subFolders.length]);

  const capacity = Math.max(1, gridSpec.cols * gridSpec.rows);
  const pageCount = Math.max(1, Math.ceil(props.filtered.length / capacity));
  const safePage = Math.min(Math.max(1, props.page), pageCount);

  useEffect(() => {
    if (props.page > pageCount) {
      props.onPageChange(pageCount);
    }
  }, [pageCount, props]);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * capacity;
    return props.filtered.slice(start, start + capacity);
  }, [capacity, props.filtered, safePage]);

  const stepPage = useCallback(
    (delta: 1 | -1) => {
      if (pageCount <= 1) return;
      const next = Math.min(pageCount, Math.max(1, safePage + delta));
      if (next !== safePage) {
        props.onPageChange(next);
      }
    },
    [pageCount, props, safePage],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (pageCount <= 1 || treePopoverOpen) return;
      const now = performance.now();
      if (now < wheelLockUntilRef.current) return;

      const dominantDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (dominantDelta === 0) return;

      wheelAccumRef.current += dominantDelta;
      if (Math.abs(wheelAccumRef.current) >= 36) {
        const dir: 1 | -1 = wheelAccumRef.current > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
        wheelLockUntilRef.current = now + 220;
        stepPage(dir);
      }
    },
    [pageCount, stepPage, treePopoverOpen],
  );

  useEffect(() => {
    if (pageCount <= 1) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (event.key === "PageDown") {
        event.preventDefault();
        stepPage(1);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        stepPage(-1);
      } else if (!isTyping && event.key === "ArrowRight") {
        event.preventDefault();
        stepPage(1);
      } else if (!isTyping && event.key === "ArrowLeft") {
        event.preventDefault();
        stepPage(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pageCount, stepPage]);

  const dateBadge = useMemo(() => {
    const locale =
      typeof document !== "undefined" && document.documentElement.lang
        ? document.documentElement.lang
        : "zh-CN";
    try {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        weekday: "short",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  const showSubRow =
    !!props.selected &&
    !props.query.trim() &&
    (props.subFolders.length > 0 || props.breadcrumb.length > 1);

  return (
    <section
      onWheel={handleWheel}
      className="flex h-full min-h-0 min-w-0 flex-col gap-3"
    >
      {/* 居中问候胶囊 */}
      {props.showHero && (
        <div className="flex shrink-0 justify-center pt-0.5">
          <div className="bento-surface inline-flex items-center gap-2.5 rounded-full px-4 py-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              {props.greeting} <span className="ml-0.5">👋</span>
            </span>
            {dateBadge && (
              <>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground">
                  {dateBadge}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 居中统一命令搜索框 */}
      <DashboardSearch
        settings={props.settings}
        query={props.query}
        onQueryChange={props.onQueryChange}
        bookmarkResults={props.filtered}
        topSites={props.topSites}
      />

      {/* 居中常驻快捷应用坞 */}
      {props.showHero && hasTopSites && (
        <div className="shrink-0">
          <TopSites
            sites={props.topSites}
            onChange={props.onTopSitesChange}
            onHide={props.onHideTopSites}
          />
        </div>
      )}

      {/* 一体化书签翻页舞台 */}
      <div
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(dx) > 48) {
            stepPage(dx < 0 ? 1 : -1);
          }
        }}
        className="flex min-h-0 flex-1 flex-col pt-0.5"
      >
        {/* 顶栏：集成式书签文件夹胶囊导航条 + 右侧页码与密度控制 */}
        <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {/* 完整目录树弹出器（支持多级展开、Pin 置顶、新建与右键管理） */}
            <div ref={treePopoverRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setTreePopoverOpen((v) => !v)}
                title={t("dash.folders")}
                className={cn(
                  "bento-surface inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition",
                  treePopoverOpen
                    ? "border-foreground/35 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FolderTreeIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("dash.folderTree")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 opacity-70 transition-transform duration-150",
                    treePopoverOpen && "rotate-180",
                  )}
                />
              </button>

              {treePopoverOpen && (
                <div
                  onWheel={(e) => e.stopPropagation()}
                  className="popover-surface absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[280px] rounded-2xl p-2.5 animate-in fade-in zoom-in-95"
                >
                  <div className="mb-1.5 flex items-center justify-between px-1.5">
                    <span className="text-[11.5px] font-semibold text-muted-foreground">
                      {t("dash.folders")}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      onClick={() => {
                        setTreePopoverOpen(false);
                        props.onCreateFolder(props.defaultFolderParentId);
                      }}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>{t("common.add")}</span>
                    </button>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto pr-0.5 scrollbar-thin">
                    <FolderTree
                      tree={props.tree}
                      selectedId={props.selected}
                      expanded={props.expanded}
                      pinnedIds={props.pinnedIds}
                      onToggle={props.onToggleExpand}
                      onSelect={(id) => {
                        props.onSelectFolder(id);
                        setTreePopoverOpen(false);
                      }}
                      onTogglePin={props.onTogglePin}
                      onContextMenu={props.onFolderContextMenu}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 横向文件夹胶囊选择坞 */}
            <nav
              aria-label={t("dash.folders")}
              className="bento-surface flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <button
                type="button"
                onClick={() => props.onSelectFolder("")}
                className={cn(
                  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                  !props.selected
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                )}
              >
                <span>{t("common.all")}</span>
                <span
                  className={cn(
                    "text-[10.5px] tabular-nums",
                    !props.selected ? "opacity-75" : "opacity-65",
                  )}
                >
                  {totalAllCount}
                </span>
              </button>

              {quickFolders.map(({ folder, pinned, count }) => {
                const active = props.selected === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => props.onSelectFolder(folder.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      props.onFolderContextMenu(folder, event);
                    }}
                    className={cn(
                      "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                      active
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                    )}
                  >
                    {pinned && (
                      <Pin className="h-2.5 w-2.5 shrink-0 opacity-75" />
                    )}
                    <span className="max-w-[120px] truncate">
                      {folder.title || t("dash.untitled")}
                    </span>
                    <span
                      className={cn(
                        "text-[10.5px] tabular-nums",
                        active ? "opacity-75" : "opacity-65",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {activeDeepFolder && (
                <button
                  type="button"
                  onClick={() =>
                    props.onSelectFolder(
                      props.breadcrumb[props.breadcrumb.length - 2]?.id ?? "",
                    )
                  }
                  className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-xs font-medium text-background shadow-sm transition"
                  title={t("common.close")}
                >
                  <span className="max-w-[130px] truncate">
                    {activeDeepFolder.title}
                  </span>
                  <span className="text-[10.5px] tabular-nums opacity-75">
                    {props.filtered.length}
                  </span>
                  <X className="h-3 w-3 opacity-80" />
                </button>
              )}
            </nav>
          </div>

          {/* 右侧：过滤计数、页码与密度切换 */}
          <div className="flex shrink-0 items-center gap-1.5">
            {props.canReorder && (
              <span className="bento-surface hidden h-8 items-center gap-1 rounded-xl px-2.5 text-[11px] text-muted-foreground xl:inline-flex">
                <GripVertical className="h-3 w-3" /> {t("dash.dragHint")}
              </span>
            )}

            {props.query.trim() && (
              <span className="bento-surface inline-flex h-8 items-center rounded-xl px-2.5 text-[11px] font-medium tabular-nums text-foreground">
                {t("dash.resultCount", String(props.filtered.length))}
              </span>
            )}

            {pageCount > 1 && (
              <span className="bento-surface inline-flex h-8 items-center rounded-xl px-2.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                {safePage} / {pageCount}
              </span>
            )}

            <div
              className="bento-surface inline-flex h-8 items-center rounded-xl p-1"
              role="group"
              aria-label={t("settings.density")}
            >
              <button
                type="button"
                onClick={() => void setSettings({ cardDensity: "comfy" })}
                title={`${t("settings.density")}：${t("settings.densityComfy")}`}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg transition",
                  !isCompact
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void setSettings({ cardDensity: "compact" })}
                title={`${t("settings.density")}：${t("settings.densityCompact")}`}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg transition",
                  isCompact
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 二级子文件夹与面包屑内联导航条（仅在进入含子目录的文件夹时出现） */}
        {showSubRow && (
          <div className="mb-2.5 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.breadcrumb.length > 1 && (
              <div className="bento-surface inline-flex h-7 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[11.5px] text-muted-foreground">
                {props.breadcrumb.map((item, idx) => {
                  const isLast = idx === props.breadcrumb.length - 1;
                  return (
                    <span key={item.id} className="inline-flex items-center gap-0.5">
                      {idx > 0 && <ChevronRight className="h-3 w-3 opacity-55" />}
                      <button
                        type="button"
                        onClick={() => props.onSelectFolder(item.id)}
                        className={cn(
                          "rounded px-1 py-0.5 transition hover:text-foreground",
                          isLast && "font-medium text-foreground",
                        )}
                      >
                        {item.title}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {props.subFolders.map((folder) => {
              const count = countSubBookmarks(folder);
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => props.onSelectFolder(folder.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    props.onFolderContextMenu(folder, event);
                  }}
                  className="bento-surface group flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs transition hover:border-foreground/30"
                >
                  <Folder className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  <span className="max-w-[140px] truncate font-medium text-foreground/90 group-hover:text-foreground">
                    {folder.title || t("dash.untitled")}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => props.onCreateFolder(props.defaultFolderParentId)}
              className="bento-surface flex h-7 shrink-0 items-center gap-1 rounded-lg border-dashed px-2 text-[11.5px] font-medium text-muted-foreground transition hover:border-foreground/35 hover:text-foreground"
            >
              <FolderPlus className="h-3 w-3" />
              <span>{t("folder.create")}</span>
            </button>
          </div>
        )}

        {/* 全宽对称网格翻页舞台 */}
        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
          {props.filtered.length > 0 ? (
            <div
              key={`${safePage}-${isCompact ? "c" : "n"}-${props.selected}`}
              style={{
                gridTemplateColumns: `repeat(${gridSpec.cols}, minmax(0, 1fr))`,
              }}
              className={cn(
                "grid content-start animate-in fade-in-0 duration-150",
                isCompact ? "gap-2" : "gap-2.5",
              )}
            >
              {pagedItems.map((bookmark) => {
                const host = hostnameOf(bookmark.url);
                const leafFolder =
                  !props.selected && bookmark.path
                    ? bookmark.path.split(" / ").pop()
                    : "";
                return (
                  <div
                    key={bookmark.id}
                    draggable={props.canReorder}
                    onDragStart={(event) => props.onDragStart(event, bookmark.id)}
                    onDragEnd={props.onDragEnd}
                    onDragOver={(event) => props.onDragOver(event, bookmark.id)}
                    onDrop={(event) => props.onDrop(event, bookmark.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      props.onBookmarkContext(bookmark, {
                        left: event.clientX,
                        right: event.clientX,
                        top: event.clientY,
                        bottom: event.clientY,
                      });
                    }}
                    className={cn(
                      "bento-surface group relative flex items-center rounded-xl transition-all duration-150 ease-out",
                      "hover:-translate-y-[1px] hover:border-foreground/30 hover:shadow-md",
                      isCompact ? "h-11 px-2.5" : "h-14 px-3",
                      props.canReorder && "cursor-grab",
                      props.dragId === bookmark.id && "cursor-grabbing opacity-45",
                      props.overId === bookmark.id &&
                        props.dragId !== bookmark.id &&
                        "ring-2 ring-foreground/45",
                    )}
                    title={
                      bookmark.path
                        ? `${bookmark.title}\n${bookmark.url}\n[${bookmark.path}]`
                        : `${bookmark.title}\n${bookmark.url}`
                    }
                  >
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "flex min-w-0 flex-1 items-center transition-[padding] duration-100 group-hover:pr-6",
                        isCompact ? "gap-2.5" : "gap-3",
                        props.canReorder && "cursor-inherit",
                      )}
                    >
                      <span
                        className={cn(
                          "flex shrink-0 items-center justify-center border border-border/65 bg-background/75 transition-colors group-hover:border-border",
                          isCompact ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl",
                        )}
                      >
                        <SiteIcon
                          url={bookmark.url}
                          title={bookmark.title}
                          className={cn(
                            isCompact
                              ? "h-4 w-4 text-[8px]"
                              : "h-[18px] w-[18px] text-[9px]",
                          )}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate font-medium text-foreground transition-colors",
                            isCompact
                              ? "text-[12.5px] leading-tight"
                              : "text-[13px] leading-snug",
                          )}
                        >
                          {bookmark.title || host}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-tight text-muted-foreground">
                          <span className="truncate">{host}</span>
                          {leafFolder && (
                            <>
                              <span aria-hidden className="opacity-45">·</span>
                              <span className="truncate opacity-75">{leafFolder}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </a>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        props.onBookmarkContext(bookmark, {
                          left: rect.left,
                          right: rect.right,
                          top: rect.top,
                          bottom: rect.bottom,
                        });
                      }}
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg border border-border/70 bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={t("common.more")}
                      title={t("common.more")}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            !props.subFolders.length && (
              <div className="bento-surface flex h-40 items-center justify-center rounded-2xl border-dashed text-center text-sm text-muted-foreground">
                {t("dash.empty")}
              </div>
            )
          )}
        </div>

        {/* 底部居中分屏圆点指示器 */}
        {pageCount > 1 && (
          <div
            className="mt-2 flex shrink-0 items-center justify-center"
            role="tablist"
            aria-label="Pages"
          >
            <div className="bento-surface inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              {Array.from({ length: pageCount }).map((_, idx) => {
                const targetPage = idx + 1;
                const active = targetPage === safePage;
                return (
                  <button
                    key={targetPage}
                    type="button"
                    onClick={() => props.onPageChange(targetPage)}
                    aria-label={`Page ${targetPage}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      active
                        ? "w-5 bg-foreground"
                        : "w-1.5 bg-foreground/25 hover:bg-foreground/50",
                    )}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
