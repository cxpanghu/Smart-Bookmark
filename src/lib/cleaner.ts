import type { BookmarkNode, CleanIssue, FlatBookmark } from "@/types";
import { flatten, allFolders, countBookmarks, getTree } from "@/lib/bookmarks";
import { normalizeUrl } from "@/lib/utils";
import { t } from "@/lib/i18n";

export interface ScanProgress {
  total: number;
  checked: number;
  phase: "structure" | "duplicates" | "done";
}

export interface ScanOptions {
  signal?: AbortSignal;
  onProgress?: (p: ScanProgress) => void;
}

export async function scanAll(
  opts: Partial<ScanOptions> = {},
): Promise<CleanIssue[]> {
  const options: ScanOptions = { ...opts };
  const tree = await getTree();
  const flat = flatten(tree);

  const issues: CleanIssue[] = [];
  issues.push(...scanEmptyFolders(tree));
  options.onProgress?.({ total: flat.length, checked: 0, phase: "structure" });

  issues.push(...scanDuplicates(flat));
  options.onProgress?.({ total: flat.length, checked: 0, phase: "duplicates" });

  issues.push(...scanBrokenUrls(flat));

  options.onProgress?.({ total: flat.length, checked: flat.length, phase: "done" });
  return issues;
}

export function scanEmptyFolders(tree: BookmarkNode[]): CleanIssue[] {
  const folders = allFolders(tree);
  return folders
    .filter((f) => f.count === 0 && f.id !== "1" && f.id !== "2" && f.id !== "3")
    .map((f) => ({
      id: `empty-${f.id}`,
      kind: "empty-folder" as const,
      title: t("cleaner.issue.emptyFolder", f.title || t("dash.untitled")),
      detail: f.path,
      folderId: f.id,
    }));
}

export function scanDuplicates(flat: FlatBookmark[]): CleanIssue[] {
  const groups = new Map<string, FlatBookmark[]>();
  for (const b of flat) {
    const key = normalizeUrl(b.url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  const out: CleanIssue[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    // 整组都进结果（含首项），「保留最新/最早」才能覆盖完整重复组；
    // 首项默认不勾选，保持「默认保留一条」的清理行为。
    const [keep, ...rest] = list;
    out.push({
      id: `dup-${keep.id}`,
      kind: "duplicate",
      title: keep.title,
      detail: t("cleaner.issue.duplicateFirst", String(list.length)),
      bookmark: keep,
      group: key,
      defaultSelected: false,
    });
    for (const dup of rest) {
      out.push({
        id: `dup-${dup.id}`,
        kind: "duplicate",
        title: dup.title,
        detail: t("cleaner.issue.duplicateOf", keep.title, keep.path),
        bookmark: dup,
        group: key,
      });
    }
  }
  return out;
}

const COMMON_PROTOCOLS = new Set([
  "http:",
  "https:",
  "chrome:",
  "edge:",
  "file:",
  "about:",
]);

export function scanBrokenUrls(flat: FlatBookmark[]): CleanIssue[] {
  const out: CleanIssue[] = [];
  for (const b of flat) {
    try {
      const u = new URL(b.url);
      if (!COMMON_PROTOCOLS.has(u.protocol)) {
        // javascript:（bookmarklet）、mailto: 等属于合法书签，仅提示、默认不勾选。
        out.push({
          id: `broken-${b.id}`,
          kind: "broken-url",
          title: b.title,
          detail: t("cleaner.issue.unusualProtocol", u.protocol),
          bookmark: b,
          defaultSelected: false,
        });
      }
    } catch {
      out.push({
        id: `broken-${b.id}`,
        kind: "broken-url",
        title: b.title,
        detail: t("cleaner.issue.invalidUrl", b.url),
        bookmark: b,
      });
    }
  }
  return out;
}

export interface Profile {
  totalBookmarks: number;
  totalFolders: number;
  emptyFolders: number;
  maxFolder?: { title: string; count: number };
  topDomains: Array<{ domain: string; count: number }>;
  uniqueDomains: number;
  oldest?: FlatBookmark;
  newest?: FlatBookmark;
  addedThisMonth: number;
  addedToday: number;
  collectDays: number;
  httpsRatio: number;
  duplicateUrls: number;
  yearBuckets: Array<{ label: string; count: number }>;
  monthBuckets: Array<{ label: string; count: number }>;
  topKeywords: Array<{ word: string; count: number }>;
  busiestDay?: { date: string; count: number };
  badges: Array<{ id: string; detailValue?: string }>;
  avgPerFolder: number;
  orgScore: number;
}

export async function buildProfile(): Promise<Profile> {
  const tree = await getTree();
  const flat = flatten(tree);
  const folders = allFolders(tree);
  const domainMap = new Map<string, number>();
  let https = 0;
  for (const b of flat) {
    try {
      const u = new URL(b.url);
      const d = u.hostname.replace(/^www\./, "");
      domainMap.set(d, (domainMap.get(d) ?? 0) + 1);
      if (u.protocol === "https:") https++;
    } catch {}
  }
  const topDomains = [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  const withDate = flat.filter((b) => typeof b.dateAdded === "number");
  const oldest = withDate.reduce<FlatBookmark | undefined>(
    (acc, b) => (!acc || (b.dateAdded ?? 0) < (acc.dateAdded ?? 0) ? b : acc),
    undefined,
  );
  const newest = withDate.reduce<FlatBookmark | undefined>(
    (acc, b) => (!acc || (b.dateAdded ?? 0) > (acc.dateAdded ?? 0) ? b : acc),
    undefined,
  );

  const today = new Date();
  const day = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const todayKey = day(today.getTime());
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let addedToday = 0;
  let addedThisMonth = 0;
  const yearMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  for (const b of withDate) {
    const ts = b.dateAdded!;
    if (day(ts) === todayKey) addedToday++;
    if (ts > monthAgo) addedThisMonth++;
    const d = new Date(ts);
    const y = String(d.getFullYear());
    const m = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1);
    const dk = day(ts);
    dayMap.set(dk, (dayMap.get(dk) ?? 0) + 1);
  }
  const yearBuckets = [...yearMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
  const monthBuckets = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, count]) => ({ label, count }));
  let busiestDay: { date: string; count: number } | undefined;
  for (const [d, c] of dayMap) {
    if (!busiestDay || c > busiestDay.count) busiestDay = { date: d, count: c };
  }

  const collectDays = oldest?.dateAdded
    ? Math.max(
        1,
        Math.round((Date.now() - oldest.dateAdded) / (24 * 60 * 60 * 1000)),
      )
    : 0;

  const emptyFolders = folders.filter((f) => f.count === 0).length;
  const maxFolder = folders.reduce<
    { title: string; count: number } | undefined
  >(
    (acc, f) =>
      !acc || f.count > acc.count
        ? { title: f.title || t("dash.untitled"), count: f.count }
        : acc,
    undefined,
  );

  const normalizedMap = new Map<string, number>();
  for (const b of flat) {
    const key = normalizeUrl(b.url);
    normalizedMap.set(key, (normalizedMap.get(key) ?? 0) + 1);
  }
  let duplicateUrls = 0;
  for (const c of normalizedMap.values()) if (c > 1) duplicateUrls++;

  const keywordMap = new Map<string, number>();
  const stopwords = new Set([
    "\u7684",
    "\u662f",
    "\u5728",
    "\u548c",
    "\u4e86",
    "\u4e0e",
    "\u6216",
    "\u53ca",
    "the",
    "a",
    "an",
    "of",
    "to",
    "for",
    "in",
    "on",
    "and",
    "or",
    "with",
    "is",
    "are",
    "was",
    "do",
    "com",
    "net",
    "org",
    "www",
    "\u9996\u9875",
    "\u8bba\u575b",
    "\u7f51\u7ad9",
    "\u8d44\u6e90",
    "\u5206\u4eab",
    "\u5728\u7ebf",
  ]);
  for (const b of flat) {
    const text = (b.title || "").toLowerCase();
    const tokens = text
      .split(/[\s,，。·\-—_|\/()\[\]「」【】《》:：]+/)
      .filter(
        (w) =>
          w.length >= 2 &&
          !stopwords.has(w) &&
          !/^\d+$/.test(w) &&
          !/^lv\d+$/i.test(w) &&
          !/^(com|net|org|io|cn|cc|tv)$/i.test(w) &&
          !/^https?$/i.test(w),
      );
    for (const w of tokens) {
      keywordMap.set(w, (keywordMap.get(w) ?? 0) + 1);
    }
  }
  const topKeywords = [...keywordMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  const badges = makeBadges({
    total: flat.length,
    topDomains,
    uniqueDomains: domainMap.size,
    folders: folders.length,
    emptyFolders,
    duplicateUrls,
    addedThisMonth,
    topKeywords,
  });

  const avgPerFolder = folders.length
    ? Math.round((flat.length / folders.length) * 10) / 10
    : 0;

  const orgScore = scoreOrg({
    total: flat.length,
    folders: folders.length,
    emptyFolders,
    duplicateUrls,
    avgPerFolder,
  });

  return {
    totalBookmarks: flat.length,
    totalFolders: folders.length,
    emptyFolders,
    maxFolder,
    topDomains,
    uniqueDomains: domainMap.size,
    oldest,
    newest,
    addedThisMonth,
    addedToday,
    collectDays,
    httpsRatio: flat.length ? https / flat.length : 0,
    duplicateUrls,
    yearBuckets,
    monthBuckets,
    topKeywords,
    busiestDay,
    badges,
    avgPerFolder,
    orgScore,
  };
}

interface BadgeInput {
  total: number;
  topDomains: Array<{ domain: string; count: number }>;
  uniqueDomains: number;
  folders: number;
  emptyFolders: number;
  duplicateUrls: number;
  addedThisMonth: number;
  topKeywords: Array<{ word: string; count: number }>;
}

function makeBadges(x: BadgeInput): Profile["badges"] {
  const out: Profile["badges"] = [];
  const hasKw = (...ks: string[]) =>
    x.topKeywords.some((k) => ks.includes(k.word));
  const hasDomain = (kw: string) =>
    x.topDomains.some((d) => d.domain.includes(kw));
  if (hasDomain("github") || hasKw("github", "api", "code", "dev"))
    out.push({
      id: "tech",
    });
  if (
    hasDomain("youtube") ||
    hasDomain("bilibili") ||
    hasKw("\u8bfe\u7a0b", "\u6559\u7a0b")
  )
    out.push({
      id: "learn",
    });
  if (hasKw("tool", "\u5de5\u5177", "\u751f\u6210\u5668", "convert"))
    out.push({
      id: "tool",
    });
  if (x.uniqueDomains >= 150 && x.total >= 500)
    out.push({
      id: "wide",
      detailValue: String(x.uniqueDomains),
    });
  if (x.addedThisMonth >= 50)
    out.push({
      id: "active",
      detailValue: String(x.addedThisMonth),
    });
  if (x.folders >= 20 && x.emptyFolders / Math.max(1, x.folders) < 0.1)
    out.push({
      id: "organizer",
    });
  return out;
}

function scoreOrg(x: {
  total: number;
  folders: number;
  emptyFolders: number;
  duplicateUrls: number;
  avgPerFolder: number;
}): number {
  if (!x.total) return 0;
  let score = 10;
  score -= (x.emptyFolders / Math.max(1, x.folders)) * 2;
  score -= (x.duplicateUrls / Math.max(1, x.total)) * 5;
  if (x.avgPerFolder < 3) score -= 1.5;
  if (x.avgPerFolder > 60) score -= 1;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export { countBookmarks };
