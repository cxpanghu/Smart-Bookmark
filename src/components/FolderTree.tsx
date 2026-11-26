import { useId, useMemo } from "react";
import type { BookmarkNode } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronRight, Pin, PinOff } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * 扁平 3D 风格的彩色文件夹图标。统一品牌色系（indigo/violet），与整体设计系统一致。
 */
function FolderIcon({
  open,
  variant = "default",
  className,
}: {
  open?: boolean;
  variant?: "default" | "all";
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const backTop = variant === "all" ? "#a78bfa" : "#818cf8";
  const backBot = variant === "all" ? "#7c3aed" : "#6366f1";
  const frontTop = variant === "all" ? "#ddd6fe" : "#c7d2fe";
  const frontBot = variant === "all" ? "#a78bfa" : "#a5b4fc";

  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`fb-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={backTop} />
            <stop offset="1" stopColor={backBot} />
          </linearGradient>
          <linearGradient id={`ff-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={frontTop} />
            <stop offset="1" stopColor={frontBot} />
          </linearGradient>
        </defs>
        <path
          d="M3 6.5A2 2 0 0 1 5 4.5h3.6a2 2 0 0 1 1.4.6l1.4 1.4H19a2 2 0 0 1 2 2V11H3V6.5Z"
          fill={`url(#fb-${uid})`}
        />
        <rect
          x="5.5"
          y="9"
          width="14"
          height="1.6"
          rx="0.6"
          fill="#ffffff"
          fillOpacity="0.75"
        />
        <path
          d="M2.6 11h18.8l-1.35 7.3A2.2 2.2 0 0 1 17.89 20H6.11a2.2 2.2 0 0 1-2.16-1.7L2.6 11Z"
          fill={`url(#ff-${uid})`}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`fb-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={backTop} />
          <stop offset="1" stopColor={backBot} />
        </linearGradient>
        <linearGradient id={`ff-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={frontTop} />
          <stop offset="1" stopColor={frontBot} />
        </linearGradient>
      </defs>
      <path
        d="M3 6.5A2 2 0 0 1 5 4.5h3.6a2 2 0 0 1 1.4.6l1.4 1.4H19a2 2 0 0 1 2 2V10H3V6.5Z"
        fill={`url(#fb-${uid})`}
      />
      <path
        d="M3 8.5h18V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5Z"
        fill={`url(#ff-${uid})`}
      />
      <path
        d="M3 8.5h18"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export interface FolderTreeProps {
  tree: BookmarkNode[];
  selectedId?: string;
  expanded: Set<string>;
  pinnedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string | "") => void;
  onTogglePin: (id: string) => void;
  onContextMenu?: (folder: { id: string; title: string }, event: React.MouseEvent) => void;
}

interface FolderItem {
  id: string;
  title: string;
  depth: number;
  count: number;
  hasChildren: boolean;
  parentChain: string[];
}

export default function FolderTree(props: FolderTreeProps) {
  const t = useT();
  const {
    tree,
    selectedId,
    expanded,
    pinnedIds,
    onToggle,
    onSelect,
    onTogglePin,
    onContextMenu,
  } = props;

  const items = useMemo(
    () => flattenForTree(tree, expanded, t("dash.untitled")),
    [tree, expanded, t],
  );

  const totalCount = useMemo(
    () => tree.reduce((sum, node) => sum + countBookmarks(node), 0),
    [tree],
  );

  return (
    <div className="space-y-0.5 text-[13px]">
      <button
        onClick={() => onSelect("")}
        className={cn(
          "relative flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors",
          !selectedId
            ? "bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/15"
            : "text-foreground/85 hover:bg-accent/70",
        )}
      >
        <FolderIcon
          variant="all"
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            !selectedId ? "scale-105" : "opacity-90",
          )}
        />
        <span className="flex-1 truncate">{t("dash.allBookmarks")}</span>
        {totalCount > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums leading-none",
              !selectedId
                ? "bg-primary/15 text-primary"
                : "bg-muted/75 text-muted-foreground",
            )}
          >
            {totalCount}
          </span>
        )}
      </button>

      {items.map((f) => {
        const isExpanded = expanded.has(f.id);
        const isSelected = selectedId === f.id;
        const isPinned = pinnedIds.has(f.id);
        return (
          <div
            key={f.id}
            onContextMenu={(event) => {
              event.preventDefault();
              onContextMenu?.({ id: f.id, title: f.title }, event);
            }}
            className={cn(
              "group relative flex h-8 items-center gap-0.5 rounded-lg pr-1 transition-colors",
              isSelected
                ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                : "hover:bg-accent/70",
            )}
            style={{ paddingLeft: Math.max(0, f.depth - 1) * 13 + "px" }}
          >
            <button
              type="button"
              onClick={() => f.hasChildren && onToggle(f.id)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-background/70 hover:text-foreground",
                !f.hasChildren && "invisible",
              )}
              aria-label={t("folder.toggle")}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-150",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
            <button
              onClick={() => onSelect(f.id)}
              className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
              title={f.title}
            >
              <FolderIcon
                open={isExpanded}
                variant={isSelected ? "all" : "default"}
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isSelected ? "scale-105" : "opacity-90 group-hover:opacity-100",
                )}
              />
              <span
                className={cn(
                  "flex-1 truncate",
                  isSelected ? "font-medium" : "text-foreground/85",
                )}
              >
                {f.title || t("dash.untitled")}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] tabular-nums leading-none transition-colors",
                  isSelected
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground group-hover:bg-muted/80",
                )}
              >
                {f.count}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(f.id);
              }}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-background/80 hover:text-foreground",
                isPinned && "opacity-100 text-primary",
              )}
              title={isPinned ? t("folder.unpin") : t("folder.pin")}
            >
              {isPinned ? (
                <Pin className="h-3 w-3" />
              ) : (
                <PinOff className="h-3 w-3" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function flattenForTree(
  tree: BookmarkNode[],
  expanded: Set<string>,
  untitled: string,
): FolderItem[] {
  const out: FolderItem[] = [];
  const walk = (
    node: BookmarkNode,
    depth: number,
    parentChain: string[],
  ) => {
    if (!node.url && node.id !== "0") {
      const children = node.children ?? [];
      const subFolders = children.filter((c) => !c.url);
      const count = countBookmarks(node);
      out.push({
        id: node.id,
        title: node.title || untitled,
        depth,
        count,
        hasChildren: subFolders.length > 0,
        parentChain,
      });
      if (expanded.has(node.id)) {
        for (const c of subFolders) walk(c, depth + 1, [...parentChain, node.id]);
      }
    } else if (node.id === "0") {
      for (const c of node.children ?? []) walk(c, 1, []);
    }
  };
  for (const n of tree) walk(n, 1, []);
  return out;
}

function countBookmarks(n: BookmarkNode): number {
  if (n.url) return 1;
  return (n.children ?? []).reduce((s, c) => s + countBookmarks(c), 0);
}
