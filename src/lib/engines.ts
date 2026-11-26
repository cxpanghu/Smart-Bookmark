import type { CustomEngine, Settings } from "@/types";

export interface EngineDef {
  id: string;
  name: string;
  url: (q: string) => string;
  /** URL host used for icon lookup */
  host: string;
  iframe?: boolean;
}

/**
 * 内置传统/专业搜索引擎（已剔除所有 AI 对话搜索入口）。
 */
export const BUILTIN_ENGINES: EngineDef[] = [
  {
    id: "google",
    name: "Google",
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    host: "google.com",
  },
  {
    id: "bing",
    name: "Bing",
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    host: "bing.com",
  },
  {
    id: "baidu",
    name: "Baidu",
    url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    host: "baidu.com",
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    host: "duckduckgo.com",
    iframe: true,
  },
  {
    id: "github",
    name: "GitHub",
    url: (q) =>
      `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
    host: "github.com",
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow",
    url: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
    host: "stackoverflow.com",
  },
  {
    id: "mdn",
    name: "MDN",
    url: (q) =>
      `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
    host: "developer.mozilla.org",
    iframe: true,
  },
];

function toEngineDef(c: CustomEngine): EngineDef {
  return {
    id: c.id,
    name: c.name,
    url: (q) =>
      c.url.includes("%s")
        ? c.url.replace(/%s/g, encodeURIComponent(q))
        : c.url +
          (c.url.includes("?") ? "&" : "?") +
          "q=" +
          encodeURIComponent(q),
    host: hostOf(c.url),
  };
}

export function allEngines(settings: Settings): EngineDef[] {
  return [
    ...BUILTIN_ENGINES,
    ...(settings.customEngines ?? []).map(toEngineDef),
  ];
}

export function findEngine(
  settings: Settings,
  id: string,
): EngineDef | undefined {
  return allEngines(settings).find((engine) => engine.id === id);
}

export function faviconFor(engine: EngineDef): string {
  try {
    const pageUrl = new URL(engine.host);
    return localFavicon(pageUrl.toString(), 64);
  } catch {
    return localFavicon(`https://${engine.host}/`, 64);
  }
}

function localFavicon(pageUrl: string, size: number): string {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.getURL ||
    !chrome.runtime?.id
  ) {
    return "";
  }
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", pageUrl);
  faviconUrl.searchParams.set("size", String(size));
  return faviconUrl.toString();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
