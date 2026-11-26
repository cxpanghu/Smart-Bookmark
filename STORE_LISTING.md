# Smart Bookmark 商店文案 / Store Listing

## 中文

### 名称

Smart Bookmark - 书签清理 + 新标签页

### 简短说明

本地优先的书签管理、清理、备份与新标签页看板，适用于 Chrome 和 Edge。

### 详细说明

Smart Bookmark 把日常书签工作集中到一个清爽的新标签页：

- 搜索和浏览书签文件夹，支持历史联想与键盘选择。
- 编辑书签名称和网址、移动书签、新建和重命名文件夹。
- 扫描重复书签、空文件夹与异常 URL。
- 删除前自动创建本地快照，支持撤销和手动恢复。
- 常驻站点、自定义搜索引擎、侧边栏和二维码。
- JSON / Netscape HTML 导入导出。
- 本地 favicon、双语界面、响应式布局、浅色和深色主题。

书签、设置和清理快照均在本机处理。扩展不申请 Cookie 权限或全域主机权限。

### 快捷键

- `Alt+B`：打开侧边栏
- `Alt+Shift+C`：打开清理中心
- `Ctrl+K` / `Command+K`：聚焦看板搜索

## English

### Name

Smart Bookmark - Cleaner + New Tab

### Short description

Local-first bookmark management, cleanup, backup, and a new-tab dashboard for Chrome and Edge.

### Full description

Smart Bookmark brings everyday bookmark work into one responsive new-tab dashboard:

- Browse and search folders with history suggestions and keyboard navigation.
- Edit names and URLs, move bookmarks, and create or rename folders.
- Find duplicate bookmarks, empty folders, and malformed URLs.
- Create a local snapshot before deletion, with undo and manual restore.
- Configure pinned sites and custom search engines; use the side panel and QR tools.
- Import or export JSON and Netscape HTML.
- Local favicons, bilingual UI, responsive layout, and light/dark themes.

Bookmarks, settings, and cleanup snapshots are processed locally. The extension does not request Cookie access or broad host access.

### Keyboard shortcuts

- `Alt+B`: open the side panel
- `Alt+Shift+C`: open the cleaner
- `Ctrl+K` / `Command+K`: focus dashboard search

## 权限说明 / Permission justification

| Permission | Justification |
| --- | --- |
| `bookmarks` | Core bookmark display, search, edit, move, cleanup, import, and export. |
| `favicon` | Uses Chrome's local favicon cache; no remote icon service. |
| `storage` | Stores local preferences, pinned sites, custom engines, and the three latest cleanup snapshots. |
| `history` | Queried only while the user searches, to show local suggestions. |
| `contextMenus` | User-invoked copy, QR, search, cleaner, and side-panel actions. |
| `sidePanel` | Provides the bookmark side-panel interface. |
| `activeTab`, `scripting` | Used only after a user clicks a copy-address context-menu action, so the selected page can write the URL to the clipboard. |

## Review test flow

1. Open a new tab and verify folder navigation, search, pagination, and responsive card layout.
2. Right-click a bookmark card to edit, move, create a QR code, or delete with undo.
3. Open Cleaner, scan local structural issues, delete a test item, then use Undo or restore its snapshot from Backup.
4. Open Settings to add a custom search template containing `%s`, reorder pinned sites, switch language, and change themes.
5. Use `Alt+B` for the side panel and verify arrow-key search selection.
