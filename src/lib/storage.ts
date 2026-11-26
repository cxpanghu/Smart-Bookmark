import type { Settings } from "@/types";
import { BUILTIN_ENGINES } from "@/lib/engines";

const KEY = "smart-bookmark::settings";
const fallbackListeners = new Set<(settings: Settings) => void>();

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  rootFolderId: undefined,
  wallpaper: undefined,
  searchEngine: "google",
  cardDensity: "comfy",
  pageSize: 60,
  language: "auto",
  customEngines: [],
  topSites: [
    { title: "ChatGPT", url: "https://chatgpt.com/" },
    { title: "Gemini", url: "https://gemini.google.com/" },
    { title: "Claude", url: "https://claude.ai/" },
    { title: "Gmail", url: "https://mail.google.com/" },
    { title: "QQ Mail", url: "https://mail.qq.com/" },
    { title: "Xiaohongshu", url: "https://www.xiaohongshu.com/" },
    { title: "Doubao", url: "https://www.doubao.com/chat/" },
    { title: "NGA", url: "https://bbs.nga.cn/" },
    { title: "LINUX DO", url: "https://linux.do/" },
    { title: "YouTube", url: "https://www.youtube.com/" },
    { title: "Bilibili", url: "https://www.bilibili.com/" },
    { title: "X / Twitter", url: "https://x.com/" },
    { title: "Grok", url: "https://grok.com/" },
  ],
  expandedFolders: [],
  pinnedFolderIds: [],
  showTopSites: true,
};

const hasChromeStorage = typeof chrome !== "undefined" && !!chrome.storage?.local;

export async function getSettings(): Promise<Settings> {
  if (!hasChromeStorage) {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Settings>) : undefined;
    const normalized = normalizeSettings(saved);
    if (saved && hasUnknownKeys(saved)) {
      localStorage.setItem(KEY, JSON.stringify(normalized));
    }
    return normalized;
  }
  const { [KEY]: saved } = await chrome.storage.local.get(KEY);
  const normalized = normalizeSettings(saved);
  if (saved && hasUnknownKeys(saved)) {
    await chrome.storage.local.set({ [KEY]: normalized });
  }
  return normalized;
}

export async function setSettings(next: Partial<Settings>): Promise<Settings> {
  const prev = await getSettings();
  const merged: Settings = { ...prev, ...next };
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [KEY]: merged });
  } else {
    localStorage.setItem(KEY, JSON.stringify(merged));
    fallbackListeners.forEach((handler) => handler(merged));
  }
  return merged;
}

export function onSettingsChange(handler: (s: Settings) => void): () => void {
  if (!hasChromeStorage) {
    fallbackListeners.add(handler);
    return () => fallbackListeners.delete(handler);
  }
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes[KEY]) {
      handler(normalizeSettings(changes[KEY].newValue));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

const KNOWN_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;

function hasUnknownKeys(saved: object): boolean {
  return Object.keys(saved).some(
    (key) => !KNOWN_KEYS.includes(key as keyof Settings),
  );
}

function pickKnown(saved: Partial<Settings>): Partial<Settings> {
  const picked: Record<string, unknown> = {};
  for (const key of KNOWN_KEYS) {
    if (key in saved && (saved as Record<string, unknown>)[key] !== undefined) {
      picked[key] = (saved as Record<string, unknown>)[key];
    }
  }
  return picked as Partial<Settings>;
}

function normalizeSettings(saved?: Partial<Settings>): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...pickKnown(saved ?? {}) };
  const validPageSizes = new Set<Settings["pageSize"]>([24, 60, 120, 240, "all"]);
  if (!validPageSizes.has(merged.pageSize)) merged.pageSize = 60;
  const availableEngineIds = new Set([
    ...BUILTIN_ENGINES.map((engine) => engine.id),
    ...(merged.customEngines ?? []).map((engine) => engine.id),
  ]);
  if (!availableEngineIds.has(merged.searchEngine)) {
    merged.searchEngine = "google";
  }
  return merged;
}
