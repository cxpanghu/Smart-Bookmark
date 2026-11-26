import type { BookmarkNode, CleanIssue } from "@/types";
import { flatten, getTree } from "@/lib/bookmarks";
import { normalizeUrl } from "@/lib/utils";

export interface BackupNode {
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BackupNode[];
}

export interface BackupFile {
  app: "smart-bookmark";
  version: 1;
  exportedAt: number;
  tree: BackupNode[];
}

const TRASH_SNAPSHOT_PREFIX = "sb::trash-snapshot::";

export interface TrashSnapshotEntry {
  sourceId: string;
  parentId?: string;
  index?: number;
  node: BackupNode;
}

export interface TrashSnapshot {
  key: string;
  createdAt: number;
  entries: TrashSnapshotEntry[];
}

function toBackupNode(n: BookmarkNode): BackupNode {
  return {
    title: n.title || "",
    url: n.url,
    dateAdded: n.dateAdded,
    dateGroupModified: (n as any).dateGroupModified,
    children: n.children?.map(toBackupNode),
  };
}

export async function createTrashSnapshot(
  issues: CleanIssue[],
): Promise<TrashSnapshot | null> {
  if (typeof chrome === "undefined" || !chrome.bookmarks || !chrome.storage?.local)
    return null;
  const entries: TrashSnapshotEntry[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    const sourceId = issue.folderId ?? issue.bookmark?.id;
    if (!sourceId || seen.has(sourceId)) continue;
    seen.add(sourceId);
    try {
      const [root] = await chrome.bookmarks.getSubTree(sourceId);
      if (!root) continue;
      entries.push({
        sourceId,
        parentId: root.parentId,
        index: root.index,
        node: toBackupNode(root),
      });
    } catch {
      // The item may have disappeared between scan and confirmation.
    }
  }
  if (entries.length === 0) return null;
  const createdAt = Date.now();
  const key = `${TRASH_SNAPSHOT_PREFIX}${createdAt}`;
  const snapshot: TrashSnapshot = { key, createdAt, entries };
  await chrome.storage.local.set({ [key]: snapshot });
  const existing = await listTrashSnapshots();
  const stale = existing.slice(3);
  if (stale.length > 0) {
    await chrome.storage.local.remove(stale.map((item) => item.key));
  }
  return snapshot;
}

export async function listTrashSnapshots(): Promise<TrashSnapshot[]> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
  const stored = await chrome.storage.local.get(null);
  return Object.entries(stored)
    .filter(([key]) => key.startsWith(TRASH_SNAPSHOT_PREFIX))
    .map(([key, value]) => ({ ...(value as TrashSnapshot), key }))
    .filter((value) => Array.isArray(value.entries))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function restoreTrashSnapshot(
  snapshotOrKey: TrashSnapshot | string,
): Promise<{ restored: number; skipped: number; failed: number }> {
  if (typeof chrome === "undefined" || !chrome.bookmarks || !chrome.storage?.local)
    return { restored: 0, skipped: 0, failed: 0 };
  let snapshot: TrashSnapshot | undefined;
  if (typeof snapshotOrKey === "string") {
    const stored = await chrome.storage.local.get(snapshotOrKey);
    snapshot = stored[snapshotOrKey] as TrashSnapshot | undefined;
  } else {
    snapshot = snapshotOrKey;
  }
  if (!snapshot) return { restored: 0, skipped: 0, failed: 0 };

  const tree = await chrome.bookmarks.getTree();
  const fallbackParent = tree[0]?.children?.[0]?.id ?? "1";
  const recreatedFolders = new Map<string, string>();
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  const exists = async (id?: string) => {
    if (!id) return false;
    try {
      return (await chrome.bookmarks.get(id)).length > 0;
    } catch {
      return false;
    }
  };

  const restoreNode = async (
    node: BackupNode,
    parentId: string,
    index?: number,
    sourceId?: string,
  ) => {
    const created = await chrome.bookmarks.create({
      parentId,
      index,
      title: node.title || node.url || "Untitled",
      ...(node.url ? { url: node.url } : {}),
    });
    restored++;
    if (!node.url && sourceId) recreatedFolders.set(sourceId, created.id);
    for (const child of node.children ?? []) {
      await restoreNode(child, created.id);
    }
  };

  for (const entry of snapshot.entries) {
    if (await exists(entry.sourceId)) {
      skipped++;
      continue;
    }
    const mappedParent = entry.parentId
      ? recreatedFolders.get(entry.parentId)
      : undefined;
    const parentId =
      mappedParent ?? ((await exists(entry.parentId)) ? entry.parentId! : fallbackParent);
    try {
      await restoreNode(entry.node, parentId, entry.index, entry.sourceId);
    } catch {
      failed++;
    }
  }

  // 有恢复失败时保留快照，避免瞬时错误导致剩余恢复源永久丢失。
  if (failed === 0) {
    await chrome.storage.local.remove(snapshot.key);
  }
  return { restored, skipped, failed };
}

export async function buildBackup(): Promise<BackupFile> {
  const tree = await getTree();
  const topLevel = tree[0]?.children ?? tree;
  return {
    app: "smart-bookmark",
    version: 1,
    exportedAt: Date.now(),
    tree: topLevel.map(toBackupNode),
  };
}

export function downloadJsonBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `smart-bookmark-backup-${ymd()}.json`);
}

export function downloadHtmlBackup(backup: BackupFile) {
  const html = toNetscapeHtml(backup.tree);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, `smart-bookmark-backup-${ymd()}.html`);
}

function ymd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function countBackupUrls(nodes: BackupNode[]): number {
  let n = 0;
  const walk = (node: BackupNode) => {
    if (node.url) n++;
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return n;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toNetscapeHtml(nodes: BackupNode[]): string {
  const lines: string[] = [];
  lines.push(
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- This is an automatically generated file by Smart Bookmark. -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  );
  const writeNode = (n: BackupNode, indent: string) => {
    const add = n.dateAdded ? ` ADD_DATE="${Math.floor(n.dateAdded / 1000)}"` : "";
    if (n.url) {
      lines.push(
        `${indent}<DT><A HREF="${escHtml(n.url)}"${add}>${escHtml(n.title)}</A>`,
      );
    } else {
      const mod = n.dateGroupModified
        ? ` LAST_MODIFIED="${Math.floor(n.dateGroupModified / 1000)}"`
        : "";
      lines.push(`${indent}<DT><H3${add}${mod}>${escHtml(n.title)}</H3>`);
      lines.push(`${indent}<DL><p>`);
      for (const c of n.children ?? []) writeNode(c, indent + "    ");
      lines.push(`${indent}</DL><p>`);
    }
  };
  for (const n of nodes) writeNode(n, "    ");
  lines.push("</DL><p>");
  return lines.join("\n");
}

export function parseNetscapeHtml(html: string): BackupNode[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector("dl");
  if (!root) return [];
  const parseDl = (dl: Element): BackupNode[] => {
    const out: BackupNode[] = [];
    const kids = Array.from(dl.children);
    for (let i = 0; i < kids.length; i++) {
      const dt = kids[i];
      if (dt.tagName.toLowerCase() !== "dt") continue;
      const a = dt.querySelector(":scope > a");
      const h3 = dt.querySelector(":scope > h3");
      if (a) {
        const url = a.getAttribute("href") || "";
        const title = (a.textContent || "").trim();
        const add = a.getAttribute("add_date");
        out.push({
          title,
          url,
          dateAdded: add ? Number(add) * 1000 : undefined,
        });
      } else if (h3) {
        const title = (h3.textContent || "").trim();
        const childDl =
          (kids[i + 1] && kids[i + 1].tagName.toLowerCase() === "dl"
            ? kids[i + 1]
            : dt.querySelector(":scope > dl")) || null;
        out.push({
          title,
          children: childDl ? parseDl(childDl as Element) : [],
        });
      }
    }
    return out;
  };
  return parseDl(root);
}

export interface ImportResult {
  added: number;
  skipped: number;
}

export async function importIntoFolder(
  parentId: string,
  nodes: BackupNode[],
  existingUrls: Set<string>,
): Promise<ImportResult> {
  let added = 0;
  let skipped = 0;
  const hasApi = typeof chrome !== "undefined" && !!chrome.bookmarks;
  if (!hasApi) return { added, skipped };

  const createFolder = (title: string, parent: string) =>
    new Promise<string>((resolve, reject) => {
      chrome.bookmarks.create({ parentId: parent, title }, (n) => {
        if (chrome.runtime.lastError)
          reject(new Error(chrome.runtime.lastError.message));
        else resolve(n.id);
      });
    });
  const createLink = (title: string, url: string, parent: string) =>
    new Promise<void>((resolve, reject) => {
      chrome.bookmarks.create({ parentId: parent, title, url }, () => {
        if (chrome.runtime.lastError)
          reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });

  const walk = async (items: BackupNode[], parent: string) => {
    for (const it of items) {
      if (it.url) {
        const key = normalize(it.url);
        if (existingUrls.has(key)) {
          skipped++;
          continue;
        }
        try {
          await createLink(it.title || it.url, it.url, parent);
          existingUrls.add(key);
          added++;
        } catch {
          skipped++;
        }
      } else {
        const id = await createFolder(it.title || "(untitled)", parent);
        await walk(it.children ?? [], id);
      }
    }
  };
  await walk(nodes, parentId);
  return { added, skipped };
}

// 与清理器共用同一套 URL 归一化（hostname 小写、path/query 保留大小写）。
const normalize = normalizeUrl;

export async function collectExistingUrls(): Promise<Set<string>> {
  const tree = await getTree();
  const set = new Set<string>();
  for (const b of flatten(tree)) set.add(normalize(b.url));
  return set;
}
