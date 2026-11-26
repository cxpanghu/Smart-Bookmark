import { useEffect, useMemo, useState } from "react";
import type { BookmarkNode, CleanIssue } from "@/types";
import {
  allFolders,
  createFolder,
  moveBookmark,
  removeBookmark,
  removeTree,
  updateBookmark,
} from "@/lib/bookmarks";
import {
  createTrashSnapshot,
  restoreTrashSnapshot,
} from "@/lib/backup";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export interface BookmarkTarget {
  id: string;
  title: string;
  url: string;
  parentId?: string;
}

export interface FolderTarget {
  id: string;
  title: string;
  parentId?: string;
}

export interface FolderEditTarget {
  mode: "create" | "rename";
  id?: string;
  parentId: string;
  title: string;
}

interface Props {
  tree: BookmarkNode[];
  editBookmark: BookmarkTarget | null;
  moveTarget: BookmarkTarget | null;
  deleteBookmarkTarget: BookmarkTarget | null;
  editFolder: FolderEditTarget | null;
  deleteFolderTarget: FolderTarget | null;
  onCloseEditBookmark: () => void;
  onCloseMove: () => void;
  onCloseDeleteBookmark: () => void;
  onCloseEditFolder: () => void;
  onCloseDeleteFolder: () => void;
  onDone: () => void | Promise<void>;
}

export default function BookmarkDialogs(props: Props) {
  const t = useT();
  const folders = useMemo(() => allFolders(props.tree), [props.tree]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folderTitle, setFolderTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTitle(props.editBookmark?.title ?? "");
    setUrl(props.editBookmark?.url ?? "");
    setError("");
  }, [props.editBookmark]);

  useEffect(() => {
    setFolderTitle(props.editFolder?.title ?? "");
    setError("");
  }, [props.editFolder]);

  useEffect(() => {
    setDestination(
      props.moveTarget?.parentId ?? folders[0]?.id ?? "",
    );
  }, [folders, props.moveTarget]);

  const saveBookmark = async () => {
    if (!props.editBookmark) return;
    const nextTitle = title.trim();
    const nextUrl = url.trim();
    if (!nextTitle || !isHttpUrl(nextUrl)) {
      setError(t("bookmark.invalidEdit"));
      return;
    }
    setPending(true);
    try {
      await updateBookmark(props.editBookmark.id, {
        title: nextTitle,
        url: nextUrl,
      });
      toast(t("bookmark.updated"), "success");
      props.onCloseEditBookmark();
      await props.onDone();
    } finally {
      setPending(false);
    }
  };

  const move = async () => {
    if (!props.moveTarget || !destination) return;
    setPending(true);
    try {
      await moveBookmark(props.moveTarget.id, destination);
      toast(t("bookmark.moved"), "success");
      props.onCloseMove();
      await props.onDone();
    } finally {
      setPending(false);
    }
  };

  const saveFolder = async () => {
    if (!props.editFolder) return;
    const nextTitle = folderTitle.trim();
    if (!nextTitle) {
      setError(t("folder.titleRequired"));
      return;
    }
    setPending(true);
    try {
      if (props.editFolder.mode === "create") {
        await createFolder(props.editFolder.parentId, nextTitle);
        toast(t("folder.created"), "success");
      } else if (props.editFolder.id) {
        await updateBookmark(props.editFolder.id, { title: nextTitle });
        toast(t("folder.renamed"), "success");
      }
      props.onCloseEditFolder();
      await props.onDone();
    } finally {
      setPending(false);
    }
  };

  const deleteBookmark = async () => {
    const target = props.deleteBookmarkTarget;
    if (!target) return;
    setPending(true);
    try {
      const issue: CleanIssue = {
        id: `single-${target.id}`,
        kind: "broken-url",
        title: target.title,
        detail: target.url,
        bookmark: {
          id: target.id,
          parentId: target.parentId,
          title: target.title,
          url: target.url,
          path: "",
        },
      };
      const snapshot = await createTrashSnapshot([issue]);
      await removeBookmark(target.id);
      props.onCloseDeleteBookmark();
      await props.onDone();
      toast(t("bookmark.deleted"), "success", {
        duration: 30_000,
        ...(snapshot
          ? {
              action: {
                label: t("common.undo"),
                onClick: async () => {
                  await restoreTrashSnapshot(snapshot);
                  await props.onDone();
                  toast(t("bookmark.restored"), "success");
                },
              },
            }
          : {}),
      });
    } finally {
      setPending(false);
    }
  };

  const deleteFolder = async () => {
    const target = props.deleteFolderTarget;
    if (!target) return;
    setPending(true);
    try {
      const issue: CleanIssue = {
        id: `folder-${target.id}`,
        kind: "empty-folder",
        title: target.title,
        detail: "",
        folderId: target.id,
      };
      const snapshot = await createTrashSnapshot([issue]);
      await removeTree(target.id);
      props.onCloseDeleteFolder();
      await props.onDone();
      toast(t("folder.deleted"), "success", {
        duration: 30_000,
        ...(snapshot
          ? {
              action: {
                label: t("common.undo"),
                onClick: async () => {
                  await restoreTrashSnapshot(snapshot);
                  await props.onDone();
                  toast(t("folder.restored"), "success");
                },
              },
            }
          : {}),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Dialog
        open={!!props.editBookmark}
        onOpenChange={(open) => !open && !pending && props.onCloseEditBookmark()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("bookmark.edit")}</DialogTitle>
            <DialogDescription>{t("bookmark.editHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            <Input value={url} onChange={(event) => setUrl(event.target.value)} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={props.onCloseEditBookmark}>
              {t("common.cancel")}
            </Button>
            <Button disabled={pending} onClick={saveBookmark}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!props.moveTarget} onOpenChange={(open) => !open && !pending && props.onCloseMove()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("bookmark.move")}</DialogTitle>
            <DialogDescription>{props.moveTarget?.title}</DialogDescription>
          </DialogHeader>
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="h-9 w-full rounded-lg border border-input/90 bg-background/80 px-3 text-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={props.onCloseMove}>
              {t("common.cancel")}
            </Button>
            <Button disabled={pending || !destination} onClick={move}>
              {t("bookmark.move")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!props.editFolder} onOpenChange={(open) => !open && !pending && props.onCloseEditFolder()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {props.editFolder?.mode === "create"
                ? t("folder.create")
                : t("folder.rename")}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={folderTitle}
            onChange={(event) => {
              setFolderTitle(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveFolder();
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={props.onCloseEditFolder}>
              {t("common.cancel")}
            </Button>
            <Button disabled={pending} onClick={saveFolder}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!props.deleteBookmarkTarget}
        onOpenChange={(open) => !open && props.onCloseDeleteBookmark()}
        title={t("bookmark.delete")}
        description={t(
          "bookmark.confirmDelete",
          props.deleteBookmarkTarget?.title ?? "",
        )}
        pending={pending}
        onConfirm={deleteBookmark}
      />

      <ConfirmDialog
        open={!!props.deleteFolderTarget}
        onOpenChange={(open) => !open && props.onCloseDeleteFolder()}
        title={t("folder.delete")}
        description={t(
          "folder.confirmDelete",
          props.deleteFolderTarget?.title ?? "",
        )}
        pending={pending}
        onConfirm={deleteFolder}
      />
    </>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}
