export type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;

export interface FlatBookmark {
  id: string;
  parentId?: string;
  title: string;
  url: string;
  path: string;
  dateAdded?: number;
}

export interface FolderStat {
  id: string;
  title: string;
  path: string;
  count: number;
}

export type IssueKind = "invalid" | "duplicate" | "empty-folder" | "broken-url";

export interface CleanIssue {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  bookmark?: FlatBookmark;
  folderId?: string;
  group?: string;
}

export type SearchEngineId =
  | "google"
  | "baidu"
  | "doubao"
  | "kimi"
  | "deepseek"
  | "qwen"
  | "chatgpt"
  | "gemini"
  | "bing"
  | "duckduckgo"
  | "github"
  | "stackoverflow"
  | "mdn"
  | "felo"
  | "metaso"
  | "perplexity";

export type Language = "auto" | "zh" | "en";

/** 主色/强调色（影响 primary、ring 等） */
export type AccentPreset =
  | "linear"
  | "indigo"
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "violet"
  | "cyan"
  | "orange";

/**
 * 设计主题预设（theme preset）。
 *
 * 叠加在 light/dark 模式之上，每个预设是一套协调的
 * 令牌（主色 / 圆角 / 字体 / 表面色）。与 {@link AccentPreset}
 * 并存：选择非 `default` 的 themePreset 时会覆盖 accentPreset
 * 的主色。详见 `src/lib/themePresets.ts`。
 */
export type ThemePreset =
  | "default"
  | "claude"
  | "linear"
  | "apple"
  | "stripe"
  | "ibm"
  | "meta"
  | "vercel"
  | "sunset"
  | "forest";

export interface CustomEngine {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  accentPreset: AccentPreset;
  /** 设计主题预设。非 `default` 时会覆盖 accentPreset 的主色。 */
  themePreset: ThemePreset;
  rootFolderId?: string;
  wallpaper?: string;
  searchEngine: string;
  aiProvider: "openai" | "anthropic" | "none";
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl: string;
  cardDensity: "comfy" | "compact";
  language: Language;
  floatingBall: boolean;
  /** 禁用悬浮球的域名列表（域名级禁用） */
  floatingDisabledDomains: string[];
  compareEngines: string[];
  customEngines: CustomEngine[];
  expandedFolders: string[];
  pinnedFolderIds: string[];
  /** 首页是否显示「常去」（Chrome topSites）小组件 */
  showTopSites?: boolean;
}


export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** 客户端消息时间戳（不发给 API） */
  at?: number;
}
