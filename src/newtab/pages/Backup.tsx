import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  HardDriveDownload,
  FileJson,
  FileCode2,
  History,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  buildBackup,
  collectExistingUrls,
  countBackupUrls,
  downloadHtmlBackup,
  downloadJsonBackup,
  importIntoFolder,
  listTrashSnapshots,
  parseNetscapeHtml,
  restoreTrashSnapshot,
  type BackupFile,
  type BackupNode,
  type TrashSnapshot,
} from "@/lib/backup";
import { allFolders, getTree } from "@/lib/bookmarks";
import type { FolderStat } from "@/types";
import { useT } from "@/lib/i18n";
import { toast } from "@/components/ui/toast";

export default function BackupPage() {
  const t = useT();
  const [folders, setFolders] = useState<FolderStat[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<TrashSnapshot[]>([]);

  useEffect(() => {
    getTree().then((tr) => {
      const fs = allFolders(tr);
      setFolders(fs);
      setParentId(fs[0]?.id ?? "");
    });
    listTrashSnapshots().then(setSnapshots);
  }, []);

  const restoreSnapshot = async (snapshot: TrashSnapshot) => {
    setBusy(true);
    try {
      const result = await restoreTrashSnapshot(snapshot);
      if (result.failed > 0) {
        toast(t("backup.snapshotRestoreFailed", String(result.failed)), "error");
      } else {
        toast(t("backup.snapshotRestored", String(result.restored)), "success");
      }
      setSnapshots(await listTrashSnapshots());
    } finally {
      setBusy(false);
    }
  };

  const doExport = async (kind: "json" | "html") => {
    setBusy(true);
    try {
      const backup = await buildBackup();
      if (kind === "json") downloadJsonBackup(backup);
      else downloadHtmlBackup(backup);
      toast(t("backup.exported", String(countBackupUrls(backup.tree))), "success");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    if (!parentId) {
      toast("Pick a folder first", "error");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      let nodes: BackupNode[] = [];
      if (file.name.endsWith(".json")) {
        const j = JSON.parse(text) as BackupFile | BackupNode[];
        nodes = Array.isArray(j) ? j : j.tree;
      } else {
        nodes = parseNetscapeHtml(text);
      }
      const existing = await collectExistingUrls();
      const { added, skipped } = await importIntoFolder(parentId, nodes, existing);
      toast(
        t("backup.imported", String(added), String(skipped)),
        "success",
      );
    } catch (err: any) {
      toast(err?.message ?? "Import failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {/* 导出区 */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-inset ring-primary/20">
              <HardDriveDownload className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>{t("backup.title")}</CardTitle>
              <CardDescription className="mt-1">
                {t("backup.subtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void doExport("json")}
            className="group flex items-start gap-3 rounded-xl border border-border/80 bg-muted/25 p-3.5 text-left transition hover:border-primary/40 hover:bg-accent/55 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/75 bg-card text-primary shadow-sm">
              <FileJson className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-foreground">
                  {t("backup.exportJson")}
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-y-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                {t("backup.exportJsonHint")}
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void doExport("html")}
            className="group flex items-start gap-3 rounded-xl border border-border/80 bg-muted/25 p-3.5 text-left transition hover:border-primary/40 hover:bg-accent/55 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/75 bg-card text-sky-600 shadow-sm dark:text-sky-400">
              <FileCode2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-foreground">
                  {t("backup.exportHtml")}
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-y-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                {t("backup.exportHtmlHint")}
              </p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* 导入区 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
              <Upload className="h-4 w-4" />
            </span>
            <CardTitle>{t("common.import")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[130px_1fr] sm:gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {t("backup.importTo")}
            </span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-9 rounded-lg border border-input/90 bg-background/80 px-3 text-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path} ({f.count})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/90 bg-muted/20 px-4 py-3.5 text-xs font-medium text-foreground transition hover:border-primary/45 hover:bg-primary/5 hover:text-primary">
              <Upload className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              <span>{t("backup.importJson")}</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void doImport(f);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/90 bg-muted/20 px-4 py-3.5 text-xs font-medium text-foreground transition hover:border-primary/45 hover:bg-primary/5 hover:text-primary">
              <Upload className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              <span>{t("backup.importHtml")}</span>
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void doImport(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t("backup.importNotice")}</span>
          </div>
        </CardContent>
      </Card>

      {/* 清理快照恢复区 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <History className="h-4 w-4" />
            </span>
            <CardTitle>{t("backup.trashSnapshots")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-6 text-center text-xs text-muted-foreground">
              {t("backup.noTrashSnapshots")}
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div
                key={snapshot.key}
                className="flex items-center gap-3 rounded-xl border border-border/75 bg-muted/20 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">
                    {t("backup.snapshotItems", String(snapshot.entries.length))}
                  </div>
                  <div className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => void restoreSnapshot(snapshot)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("backup.restoreSnapshot")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
