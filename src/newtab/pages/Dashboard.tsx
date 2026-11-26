import { useEffect, useMemo, useState } from "react";
import { findFolder, flatten, moveBookmark } from "@/lib/bookmarks";
import type { BookmarkNode, FlatBookmark, Settings } from "@/types";
import { setSettings } from "@/lib/storage";
import { rankSearchItems } from "@/lib/searchRank";
import { useT } from "@/lib/i18n";
import { toast } from "@/components/ui/toast";
import DashboardMain from "@/components/DashboardMain";
import {
  BookmarkCtxMenu,
  FolderCtxMenu,
  type MenuAnchor,
} from "@/components/BookmarkCtxMenu";
import BookmarkDialogs, {
  type BookmarkTarget,
  type FolderEditTarget,
  type FolderTarget,
} from "@/components/BookmarkDialogs";
import { useBookmarkTree } from "@/hooks/useBookmarkTree";
import QrDialog from "./QrDialog";

type Props = { settings: Settings; initialQuery?: string };

interface FolderBookmark extends FlatBookmark {
  index: number;
}

export default function Dashboard({ settings, initialQuery }: Props) {
  const t = useT();
  const { tree, reload } = useBookmarkTree();
  const [selected, setSelected] = useState(settings.rootFolderId ?? "");
  const [items, setItems] = useState<FolderBookmark[]>([]);
  const [subFolders, setSubFolders] = useState<BookmarkNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; title: string }>>([]);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [bookmarkMenu, setBookmarkMenu] = useState<
    (BookmarkTarget & { anchor: MenuAnchor }) | null
  >(null);
  const [folderMenu, setFolderMenu] = useState<
    (FolderTarget & { anchor: MenuAnchor }) | null
  >(null);
  const [editBookmark, setEditBookmark] = useState<BookmarkTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<BookmarkTarget | null>(null);
  const [deleteBookmark, setDeleteBookmark] = useState<BookmarkTarget | null>(null);
  const [editFolder, setEditFolder] = useState<FolderEditTarget | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderTarget | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const topSites = settings.topSites ?? [];
  const expanded = useMemo(
    () => new Set(settings.expandedFolders ?? []),
    [settings.expandedFolders],
  );
  const pinnedIds = useMemo(
    () => new Set(settings.pinnedFolderIds ?? []),
    [settings.pinnedFolderIds],
  );

  useEffect(() => {
    if (!tree.length) return;
    if (!selected) {
      const flat = newestFirst(flatten(tree));
      setItems(flat.map((bookmark, index) => ({ ...bookmark, index })));
      setSubFolders([]);
      setBreadcrumb([]);
      return;
    }
    const folder = findFolder(tree, selected);
    if (!folder) {
      setItems([]);
      setSubFolders([]);
      setBreadcrumb([]);
      return;
    }
    setSubFolders((folder.children ?? []).filter((child) => !child.url));
    setItems(
      flatten([folder], "").map((bookmark, index) => ({ ...bookmark, index })),
    );
    setBreadcrumb(buildBreadcrumb(tree, folder.id));
  }, [selected, tree]);

  const filtered = useMemo(() => {
    const value = query.trim();
    return value
      ? rankSearchItems(value, items, items.length).map(({ item }) => item)
      : items;
  }, [items, query]);

  useEffect(() => setPage(1), [query, selected]);

  useEffect(() => {
    if (!bookmarkMenu && !folderMenu) return;
    const close = () => {
      setBookmarkMenu(null);
      setFolderMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [bookmarkMenu, folderMenu]);

  const pinnedFolders = useMemo(
    () =>
      [...pinnedIds]
        .map((id) => findFolder(tree, id))
        .filter(Boolean) as BookmarkNode[],
    [pinnedIds, tree],
  );
  const rootFolders = useMemo(
    () => (tree[0]?.children ?? tree).filter((node) => !node.url),
    [tree],
  );
  const defaultFolderParentId =
    (selected && findFolder(tree, selected) ? selected : rootFolders[0]?.id) ??
    "1";
  const canReorder = !!selected && !query.trim() && items.length > 0;
  const greeting = useGreeting();

  const selectFolder = async (id: string) => {
    setSelected(id);
    await setSettings({ rootFolderId: id || undefined });
  };
  const toggleExpand = async (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    await setSettings({ expandedFolders: [...next] });
  };
  const togglePin = async (id: string) => {
    const next = new Set(pinnedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    await setSettings({ pinnedFolderIds: [...next] });
  };
  const createFolder = (parentId: string) =>
    setEditFolder({ mode: "create", parentId, title: "" });
  const openFolderMenu = (
    folder: { id: string; title: string; parentId?: string },
    event: React.MouseEvent,
  ) =>
    setFolderMenu({
      ...folder,
      anchor: pointAnchor(event.clientX, event.clientY),
    });
  const openBookmarkMenu = (bookmark: FlatBookmark, anchor: MenuAnchor) =>
    setBookmarkMenu({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      parentId: bookmark.parentId,
      anchor,
    });

  const dragStart = (event: React.DragEvent, id: string) => {
    if (!canReorder) return;
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    document.body.style.cursor = "grabbing";
  };
  const dragOver = (event: React.DragEvent, id: string) => {
    if (!canReorder || !dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOverId(id);
  };
  const drop = async (event: React.DragEvent, targetId: string) => {
    event.preventDefault();
    const source = items.find((item) => item.id === dragId);
    const target = items.find((item) => item.id === targetId);
    if (!source || !target || source.id === target.id || source.parentId !== target.parentId) {
      endDrag();
      return;
    }
    const siblings = items.filter((item) => item.parentId === target.parentId);
    const destinationIndex = siblings.findIndex((item) => item.id === targetId);
    const optimistic = [...items];
    const [moved] = optimistic.splice(
      optimistic.findIndex((item) => item.id === source.id),
      1,
    );
    optimistic.splice(
      optimistic.findIndex((item) => item.id === target.id),
      0,
      moved,
    );
    setItems(optimistic.map((item, index) => ({ ...item, index })));
    try {
      if (source.parentId)
        await moveBookmark(source.id, source.parentId, destinationIndex);
    } catch (error) {
      console.warn("reorder failed", error);
      toast(t("dash.reorderFailed"), "error");
      await reload();
    } finally {
      endDrag();
    }
  };
  const endDrag = () => {
    document.body.style.cursor = "";
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-[1440px]">
      <DashboardMain
        tree={tree}
        expanded={expanded}
        pinnedIds={pinnedIds}
        settings={settings}
        selected={selected}
        pinnedFolders={pinnedFolders}
        rootFolders={rootFolders}
        query={query}
        onQueryChange={setQuery}
        filtered={filtered}
        subFolders={subFolders}
        breadcrumb={breadcrumb}
        greeting={greeting}
        showHero={!query.trim()}
        topSites={topSites}
        showTopSites={!selected && (settings.showTopSites ?? true)}
        page={page}
        canReorder={canReorder}
        dragId={dragId}
        overId={overId}
        defaultFolderParentId={defaultFolderParentId}
        onSelectFolder={(id) => void selectFolder(id)}
        onToggleExpand={(id) => void toggleExpand(id)}
        onTogglePin={(id) => void togglePin(id)}
        onTopSitesChange={(sites) => setSettings({ topSites: sites }).then(() => undefined)}
        onHideTopSites={async () => {
          await setSettings({ showTopSites: false });
          toast(
            t("home.widgetHidden", t("home.widgetShort.topSites")),
            "success",
          );
        }}
        onCreateFolder={createFolder}
        onFolderContextMenu={openFolderMenu}
        onPageChange={setPage}
        onDragStart={dragStart}
        onDragEnd={endDrag}
        onDragOver={dragOver}
        onDrop={(event, id) => void drop(event, id)}
        onBookmarkContext={openBookmarkMenu}
      />

      {bookmarkMenu && (
        <BookmarkCtxMenu
          anchor={bookmarkMenu.anchor}
          onCopy={async () => {
            await navigator.clipboard.writeText(bookmarkMenu.url);
            toast(t("common.copied"), "success");
            setBookmarkMenu(null);
          }}
          onQr={() => {
            setQrUrl(bookmarkMenu.url);
            setBookmarkMenu(null);
          }}
          onEdit={() => {
            setEditBookmark(bookmarkMenu);
            setBookmarkMenu(null);
          }}
          onMove={() => {
            setMoveTarget(bookmarkMenu);
            setBookmarkMenu(null);
          }}
          onDelete={() => {
            setDeleteBookmark(bookmarkMenu);
            setBookmarkMenu(null);
          }}
          onClose={() => setBookmarkMenu(null)}
        />
      )}
      {folderMenu && (
        <FolderCtxMenu
          anchor={folderMenu.anchor}
          onRename={() => {
            setEditFolder({
              mode: "rename",
              id: folderMenu.id,
              parentId: folderMenu.parentId ?? defaultFolderParentId,
              title: folderMenu.title,
            });
            setFolderMenu(null);
          }}
          onDelete={() => {
            setDeleteFolder(folderMenu);
            setFolderMenu(null);
          }}
          onClose={() => setFolderMenu(null)}
        />
      )}
      <BookmarkDialogs
        tree={tree}
        editBookmark={editBookmark}
        moveTarget={moveTarget}
        deleteBookmarkTarget={deleteBookmark}
        editFolder={editFolder}
        deleteFolderTarget={deleteFolder}
        onCloseEditBookmark={() => setEditBookmark(null)}
        onCloseMove={() => setMoveTarget(null)}
        onCloseDeleteBookmark={() => setDeleteBookmark(null)}
        onCloseEditFolder={() => setEditFolder(null)}
        onCloseDeleteFolder={() => setDeleteFolder(null)}
        onDone={reload}
      />
      {qrUrl && <QrDialog url={qrUrl} onClose={() => setQrUrl(null)} />}
    </div>
  );
}

function newestFirst(bookmarks: FlatBookmark[]) {
  return bookmarks
    .map((bookmark, index) => ({ bookmark, index }))
    .sort(
      (left, right) =>
        (right.bookmark.dateAdded ?? 0) -
          (left.bookmark.dateAdded ?? 0) ||
        left.index - right.index,
    )
    .map(({ bookmark }) => bookmark);
}

function buildBreadcrumb(
  tree: BookmarkNode[],
  id: string,
): Array<{ id: string; title: string }> {
  const output: Array<{ id: string; title: string }> = [];
  const walk = (
    nodes: BookmarkNode[],
    chain: Array<{ id: string; title: string }>,
  ): boolean => {
    for (const node of nodes) {
      if (node.url) continue;
      const next = node.title
        ? [...chain, { id: node.id, title: node.title }]
        : chain;
      if (node.id === id) {
        output.push(...next);
        return true;
      }
      if (node.children && walk(node.children, next)) return true;
    }
    return false;
  };
  walk(tree, []);
  return output;
}

function useGreeting() {
  const t = useT();
  const hour = new Date().getHours();
  if (hour < 5) return t("dash.greeting.lateNight");
  if (hour < 11) return t("dash.greeting.morning");
  if (hour < 14) return t("dash.greeting.noon");
  if (hour < 18) return t("dash.greeting.afternoon");
  if (hour < 22) return t("dash.greeting.evening");
  return t("dash.greeting.night");
}

function pointAnchor(x: number, y: number): MenuAnchor { return { left: x, right: x, top: y, bottom: y }; }
