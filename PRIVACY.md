# Smart Bookmark 隐私政策 / Privacy Policy

更新日期 / Last updated: 2026-07-14

## 中文

Smart Bookmark 是本地优先的浏览器扩展。开发者不运营用于接收书签、浏览历史或设置数据的后台服务器。

### 本地处理与保存

- 书签由 Chrome / Edge `bookmarks` API 读取和修改。
- 主题、搜索引擎、常驻站点、天气地点和清理快照保存在 `chrome.storage.local`。
- 浏览历史仅在用户输入搜索词时用于生成本地联想，不会保存副本或上传。
- 站点图标来自浏览器本地 `_favicon` 缓存。

### 外部请求

- 用户配置天气地点后，天气卡会直接请求 Open-Meteo 的地理编码和天气接口。请求包含地点查询或经纬度，不包含书签或浏览历史。
- 用户发起普通搜索时，浏览器会打开用户选择的搜索服务；搜索词将按该服务的政策处理。
- 用户设置远程壁纸 URL 时，浏览器会加载该 URL。

### 权限

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 书签展示、搜索、编辑、移动、清理和备份 |
| `favicon` | 读取浏览器本地站点图标缓存 |
| `storage` | 保存本地设置和清理快照 |
| `history` | 用户主动搜索时提供历史联想 |
| `contextMenus` | 显示扩展右键菜单 |
| `sidePanel` | 打开书签侧边栏 |
| `activeTab`, `scripting` | 仅在用户点击复制地址菜单时向当前页执行剪贴板写入 |

扩展不申请 Cookie 权限、全域主机权限或读取网页内容的常驻脚本权限。

删除扩展会清除其本地设置。书签本身由浏览器账户管理；用户可使用备份页导出 JSON 或 HTML。

## English

Smart Bookmark is a local-first browser extension. The developer does not operate a backend that receives bookmarks, browsing history, or extension settings.

### Local processing and storage

- Bookmarks are read and changed through the Chrome / Edge `bookmarks` API.
- Theme preferences, search engines, pinned sites, weather location, and cleanup snapshots are stored in `chrome.storage.local`.
- Browsing history is queried only while the user searches, to create local suggestions. It is not copied or uploaded.
- Site icons come from the browser's local `_favicon` cache.

### External requests

- After a weather location is configured, the weather card calls Open-Meteo directly. Requests contain a place query or coordinates, not bookmarks or history.
- A normal search opens the service selected by the user; that service processes the query under its own policy.
- If the user configures a remote wallpaper URL, the browser loads that URL.

### Permissions

| Permission | Purpose |
| --- | --- |
| `bookmarks` | Display, search, edit, move, clean, and back up bookmarks |
| `favicon` | Read the browser's local site-icon cache |
| `storage` | Store local settings and cleanup snapshots |
| `history` | Show suggestions while the user actively searches |
| `contextMenus` | Show extension context-menu actions |
| `sidePanel` | Open the bookmark side panel |
| `activeTab`, `scripting` | Write to the clipboard only after the user invokes a copy-address action |

The extension does not request Cookie access, broad host access, or a persistent script that reads page content.

Uninstalling the extension removes its local settings. Bookmarks remain managed by the browser account and can also be exported as JSON or HTML from the Backup page.
