import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { scanAll, buildProfile, type Profile } from "@/lib/cleaner";
import type { CleanIssue } from "@/types";
import { removeBookmark, removeTree } from "@/lib/bookmarks";
import { cn, hostnameOf, formatDate } from "@/lib/utils";
import SiteIcon from "@/components/SiteIcon";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FolderMinus,
  Globe,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import LineChart from "@/components/LineChart";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import {
  createTrashSnapshot,
  restoreTrashSnapshot,
} from "@/lib/backup";

const KIND_ICON: Record<CleanIssue["kind"], LucideIcon> = {
  duplicate: Copy,
  "empty-folder": FolderMinus,
  "broken-url": AlertTriangle,
};
const KIND_KEY: Record<CleanIssue["kind"], string> = {
  duplicate: "cleaner.duplicate",
  "empty-folder": "cleaner.emptyFolder",
  "broken-url": "cleaner.brokenUrl",
};

export default function Cleaner() {
  const t = useT();
  const [issues, setIssues] = useState<CleanIssue[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const [phase, setPhase] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    buildProfile().then(setProfile);
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<CleanIssue["kind"], CleanIssue[]>();
    for (const it of issues) {
      if (!m.has(it.kind)) m.set(it.kind, []);
      m.get(it.kind)!.push(it);
    }
    return m;
  }, [issues]);

  const duplicateGroups = useMemo(() => {
    const all = grouped.get("duplicate") ?? [];
    const m = new Map<string, CleanIssue[]>();
    for (const it of all) {
      const k = it.group || it.id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [grouped]);

  const run = async () => {
    setScanning(true);
    setHasScanned(false);
    setProgress({ checked: 0, total: 0 });
    setIssues([]);
    setSelected(new Set());
    setPhase("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const found = await scanAll({
        signal: ctrl.signal,
        onProgress: (p) => {
          setProgress({ checked: p.checked, total: p.total });
          setPhase(p.phase);
        },
      });
      setIssues(found);
      setSelected(
        new Set(
          found
            .filter((issue) => issue.defaultSelected !== false)
            .map((issue) => issue.id),
        ),
      );
      setProfile(await buildProfile());
      setHasScanned(true);
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (kind: CleanIssue["kind"]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = (grouped.get(kind) ?? []).map((i) => i.id);
      const allSel = ids.every((id) => next.has(id));
      for (const id of ids) (allSel ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const dedupKeepNewest = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const list of duplicateGroups.values()) {
        const sorted = [...list].sort(
          (a, b) => (b.bookmark?.dateAdded ?? 0) - (a.bookmark?.dateAdded ?? 0),
        );
        sorted.forEach((it, i) => {
          if (i === 0) next.delete(it.id);
          else next.add(it.id);
        });
      }
      return next;
    });
  };

  const dedupKeepOldest = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const list of duplicateGroups.values()) {
        const sorted = [...list].sort(
          (a, b) => (a.bookmark?.dateAdded ?? 0) - (b.bookmark?.dateAdded ?? 0),
        );
        sorted.forEach((it, i) => {
          if (i === 0) next.delete(it.id);
          else next.add(it.id);
        });
      }
      return next;
    });
  };

  const dedupClearSelection = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const list of duplicateGroups.values()) {
        for (const it of list) next.delete(it.id);
      }
      return next;
    });
  };

  const applyClean = async () => {
    const toRemove = issues.filter((i) => selected.has(i.id));
    if (!toRemove.length) return;
    setConfirmOpen(true);
  };

  const performClean = async () => {
    const toRemove = issues.filter((issue) => selected.has(issue.id));
    if (!toRemove.length) return;
    setCleaning(true);
    setCleanProgress({ done: 0, total: toRemove.length });
    const snapshot = await createTrashSnapshot(toRemove);
    const removed = new Set<string>();
    for (let offset = 0; offset < toRemove.length; offset += 8) {
      const batch = toRemove.slice(offset, offset + 8);
      const results = await Promise.allSettled(
        batch.map(async (issue) => {
          if (issue.folderId) await removeTree(issue.folderId);
          else if (issue.bookmark) await removeBookmark(issue.bookmark.id);
          return issue.id;
        }),
      );
      results.forEach((result) => {
        if (result.status === "fulfilled") removed.add(result.value);
        else console.warn("remove failed", result.reason);
      });
      setCleanProgress({
        done: Math.min(offset + batch.length, toRemove.length),
        total: toRemove.length,
      });
    }
    setIssues((prev) => prev.filter((issue) => !removed.has(issue.id)));
    setSelected(new Set());
    setProfile(await buildProfile());
    setCleaning(false);
    setConfirmOpen(false);

    if (snapshot && removed.size > 0) {
      toast(t("cleaner.cleaned", String(removed.size)), "success", {
        duration: 30_000,
        action: {
          label: t("common.undo"),
          onClick: async () => {
            const result = await restoreTrashSnapshot(snapshot);
            setProfile(await buildProfile());
            if (result.failed > 0) {
              toast(
                t("backup.snapshotRestoreFailed", String(result.failed)),
                "error",
              );
            } else {
              toast(
                t("cleaner.restored", String(result.restored)),
                result.restored > 0 ? "success" : "info",
              );
            }
          },
        },
      });
    } else if (removed.size > 0) {
      toast(t("cleaner.cleaned", String(removed.size)), "success");
    }
    if (removed.size < toRemove.length) {
      toast(
        t("cleaner.cleanFailed", String(toRemove.length - removed.size)),
        "error",
      );
    }
  };

  const pct = progress.total ? (progress.checked / progress.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-inset ring-primary/20">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                {t("cleaner.scan")}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("cleaner.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {scanning && (
              <Button variant="outline" onClick={stop} className="gap-1.5">
                <Square className="h-3.5 w-3.5" /> {t("cleaner.stop")}
              </Button>
            )}
            <Button onClick={run} disabled={scanning} className="gap-1.5 px-4">
              <Play className="h-3.5 w-3.5 fill-current" /> {t("cleaner.start")}
            </Button>
          </div>
        </div>

        {scanning && (
          <div className="border-t border-border/65 bg-muted/30 px-5 py-3.5">
            <div className="mb-2 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>
                {t("cleaner.phase")}：{t(`cleaner.phase.${phase}`)}
              </span>
              <span>
                {progress.checked} / {progress.total}
              </span>
            </div>
            <Progress value={pct} />
          </div>
        )}
      </Card>

      {[...grouped.entries()].map(([kind, list]) => {
        const Icon = KIND_ICON[kind];
        return (
          <Card key={kind}>
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-3.5 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{t(KIND_KEY[kind])}</span>
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium tabular-nums text-destructive">
                  {list.length}
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                {kind === "duplicate" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-emerald-500/35 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                      onClick={dedupKeepNewest}
                    >
                      {t("cleaner.keepNewest")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-sky-500/35 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400"
                      onClick={dedupKeepOldest}
                    >
                      {t("cleaner.keepOldest")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={dedupClearSelection}
                    >
                      {t("cleaner.clearSelection")}
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => toggleGroup(kind)}
                >
                  {t("cleaner.toggleAll")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-3.5">
              {kind === "duplicate"
                ? [...duplicateGroups.entries()].map(([gkey, items]) => (
                    <DuplicateGroup
                      key={gkey}
                      items={items}
                      selected={selected}
                      onToggle={toggle}
                    />
                  ))
                : list.map((it) => (
                    <IssueRow
                      key={it.id}
                      it={it}
                      checked={selected.has(it.id)}
                      onToggle={() => toggle(it.id)}
                    />
                  ))}
            </CardContent>
          </Card>
        );
      })}

      {!issues.length && !scanning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                hasScanned
                  ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {hasScanned ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(hasScanned ? "cleaner.cleanResult" : "cleaner.noResult")}
            </p>
          </CardContent>
        </Card>
      )}

      {profile && <ProfileCard profile={profile} />}

      {issues.length > 0 && (
        <div className="sticky bottom-5 z-20 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-border/85 bg-popover/95 px-4 py-2.5 shadow-2xl shadow-black/15 backdrop-blur-xl dark:shadow-black/50">
          <div className="text-[13px] font-medium tabular-nums">
            {cleaning
              ? t(
                  "cleaner.cleanProgress",
                  String(cleanProgress.done),
                  String(cleanProgress.total),
                )
              : t(
                  "cleaner.selectedOf",
                  String(selected.size),
                  String(issues.length),
                )}
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={applyClean}
            disabled={!selected.size || cleaning}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("cleaner.cleanSelected")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("cleaner.confirmTitle")}
        description={t(
          "cleaner.confirmClean",
          String(issues.filter((issue) => selected.has(issue.id)).length),
        )}
        confirmLabel={t("cleaner.cleanSelected")}
        pending={cleaning}
        onConfirm={performClean}
      />
    </div>
  );
}

function IssueRow({
  it,
  checked,
  onToggle,
}: {
  it: CleanIssue;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition",
        checked ? "bg-destructive/[0.06] hover:bg-destructive/10" : "hover:bg-accent/70",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded accent-primary"
      />
      {it.bookmark && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
          <SiteIcon
            url={it.bookmark.url}
            title={it.bookmark.title}
            className="h-4 w-4 text-[8px]"
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-tight">{it.title}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
          {it.bookmark ? hostnameOf(it.bookmark.url) + " · " : ""}
          {it.detail}
        </div>
      </div>
    </label>
  );
}

function DuplicateGroup({
  items,
  selected,
  onToggle,
}: {
  items: CleanIssue[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  const url = items[0]?.bookmark?.url ?? "";
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/25">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/45 px-3 py-1.5 text-xs">
        <span className="inline-flex items-center gap-1 font-medium text-destructive">
          <Copy className="h-3 w-3" />
          {t("cleaner.duplicateCount", String(items.length))}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex max-w-[70%] items-center gap-1 truncate text-muted-foreground transition hover:text-primary"
          title={url}
        >
          <span className="truncate">{url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
      <div className="divide-y divide-border/50 p-1">
        {items.map((it) => (
          <IssueRow
            key={it.id}
            it={it}
            checked={selected.has(it.id)}
            onToggle={() => onToggle(it.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const t = useT();
  const levelPct = Math.min(100, Math.round((profile.orgScore / 10) * 100));
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem("smart-bookmark::profile-expanded") === "true",
  );
  const toggleExpanded = () => {
    setExpanded((value) => {
      const next = !value;
      localStorage.setItem("smart-bookmark::profile-expanded", String(next));
      return next;
    });
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/25 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>{t("cleaner.profile")}</CardTitle>
              <CardDescription className="mt-0.5 text-[11px]">
                HTTPS {Math.round(profile.httpsRatio * 100)}% · {profile.uniqueDomains}{" "}
                {t("cleaner.uniqueDomains")}
              </CardDescription>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-2 sm:max-w-lg sm:grid-cols-4">
            <ProfileSummary label={t("cleaner.total")} value={profile.totalBookmarks} />
            <ProfileSummary label={t("cleaner.folders")} value={profile.totalFolders} />
            <ProfileSummary label={t("cleaner.duplicateGroups")} value={profile.duplicateUrls} />
            <ProfileSummary label={t("cleaner.emptyFolder")} value={profile.emptyFolders} />
          </div>

          <Button size="sm" variant="outline" onClick={toggleExpanded} className="gap-1">
            <span>
              {expanded ? t("cleaner.collapseProfile") : t("cleaner.expandProfile")}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150",
                expanded && "rotate-180",
              )}
            />
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-12">
          <div className="col-span-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:col-span-7">
            <Stat icon={<Sparkles className="h-3.5 w-3.5 text-indigo-500" />} label={t("cleaner.total")} value={profile.totalBookmarks} />
            <Stat icon={<FolderMinus className="h-3.5 w-3.5 text-amber-500" />} label={t("cleaner.folders")} value={t("cleaner.folderValue", String(profile.totalFolders), String(profile.emptyFolders))} />
            <Stat icon={<Calendar className="h-3.5 w-3.5 text-emerald-500" />} label={t("cleaner.collectDays")} value={profile.collectDays} />
            <Stat icon={<TrendingUp className="h-3.5 w-3.5 text-fuchsia-500" />} label={t("cleaner.added30")} value={profile.addedThisMonth} />
            <Stat icon={<Clock className="h-3.5 w-3.5 text-sky-500" />} label={t("cleaner.addedToday")} value={profile.addedToday} />
            <Stat icon={<Globe className="h-3.5 w-3.5 text-rose-500" />} label={t("cleaner.uniqueDomains")} value={profile.uniqueDomains} />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />} label={t("cleaner.httpsRatio")} value={`${Math.round(profile.httpsRatio * 100)}%`} />
            <Stat icon={<Copy className="h-3.5 w-3.5 text-red-500" />} label={t("cleaner.duplicateUrlGroups")} value={profile.duplicateUrls} />
            <Stat icon={<Award className="h-3.5 w-3.5 text-amber-500" />} label={t("cleaner.averagePerFolder")} value={profile.avgPerFolder} />
          </div>

          <div className="col-span-1 space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5 lg:col-span-5">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/85">{t("cleaner.yearTrend")}</span>
                {profile.busiestDay && (
                  <span className="tabular-nums">
                    {t("cleaner.peak", profile.busiestDay.date, String(profile.busiestDay.count))}
                  </span>
                )}
              </div>
              <div className="text-primary">
                <LineChart data={profile.yearBuckets} height={106} />
              </div>
            </div>
            {profile.monthBuckets.length > 1 && (
              <div>
                <div className="mb-1 text-[11px] font-medium text-foreground/85">{t("cleaner.lastTwelveMonths")}</div>
                <div className="text-primary">
                  <LineChart data={profile.monthBuckets} height={96} />
                </div>
              </div>
            )}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${levelPct}%` }}
              />
            </div>
          </div>

          <div className="col-span-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-12">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t("cleaner.topDomains")}</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.topDomains.map((d) => (
                  <span
                    key={d.domain}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/75 bg-card px-2 py-1 text-xs"
                  >
                    <span className="truncate font-medium text-foreground/90">{d.domain}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {d.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t("cleaner.topKeywords")}</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.topKeywords.map((k) => (
                  <span
                    key={k.word}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/75 bg-card px-2 py-1 text-xs"
                  >
                    <span className="text-foreground/90">{k.word}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {k.count}
                    </span>
                  </span>
                ))}
                {profile.topKeywords.length === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {profile.badges.length > 0 && (
            <div className="col-span-1 lg:col-span-12">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t("cleaner.badges")}</div>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                    title={t(`cleaner.badge.${b.id}Detail`, b.detailValue ?? "")}
                  >
                    🏆 {t(`cleaner.badge.${b.id}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile.oldest || profile.newest || profile.maxFolder) && (
            <div className="col-span-1 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-3 lg:col-span-12">
              {profile.oldest && (
                <Mini label={t("cleaner.oldestBookmark")}>
                  <div className="truncate font-medium text-foreground">{profile.oldest.title}</div>
                  <div className="mt-0.5 truncate text-muted-foreground">
                    {formatDate(profile.oldest.dateAdded)}
                  </div>
                </Mini>
              )}
              {profile.newest && (
                <Mini label={t("cleaner.newestBookmark")}>
                  <div className="truncate font-medium text-foreground">{profile.newest.title}</div>
                  <div className="mt-0.5 truncate text-muted-foreground">
                    {formatDate(profile.newest.dateAdded)}
                  </div>
                </Mini>
              )}
              {profile.maxFolder && (
                <Mini label={t("cleaner.largestFolder")}>
                  <div className="truncate font-medium text-foreground">{profile.maxFolder.title}</div>
                  <div className="mt-0.5 text-muted-foreground">
                    {t("cleaner.itemCount", String(profile.maxFolder.count))}
                  </div>
                </Mini>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ProfileSummary({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/85 px-2.5 py-1.5">
      <div className="truncate text-[10.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
