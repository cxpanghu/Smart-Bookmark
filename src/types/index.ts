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

export type IssueKind = "duplicate" | "empty-folder" | "broken-url";

export interface CleanIssue {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  bookmark?: FlatBookmark;
  folderId?: string;
  group?: string;
  /** 扫描后是否默认勾选。false 用于「建议保留」项（重复组首项、可解析的特殊协议书签）。 */
  defaultSelected?: boolean;
}

export type SearchEngineId =
  | "google"
  | "bing"
  | "baidu"
  | "duckduckgo"
  | "github"
  | "stackoverflow"
  | "mdn";

export type Language = "auto" | "zh" | "en";

export interface CustomEngine {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

export interface TopSite {
  title: string;
  url: string;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  rootFolderId?: string;
  wallpaper?: string;
  searchEngine: string;
  cardDensity: "comfy" | "compact";
  pageSize: 24 | 60 | 120 | 240 | "all";
  language: Language;
  customEngines: CustomEngine[];
  topSites: TopSite[];
  expandedFolders: string[];
  pinnedFolderIds: string[];
  /** 首页是否显示「常驻 Tab」小组件 */
  showTopSites?: boolean;
}
