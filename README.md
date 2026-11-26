# Smart Bookmark

本地优先的 Chrome / Edge MV3 书签管理扩展：提供新标签页看板、书签清理、编辑与移动、备份恢复、侧边栏、二维码和可选天气卡。

## 功能

- 新标签页书签看板：文件夹导航、模糊搜索、历史联想、分页与拖动排序。
- 完整管理：编辑名称和网址、移动书签、新建/重命名/删除文件夹。
- 安全清理：检测重复书签、空文件夹和异常 URL；删除前创建本地快照，支持 30 秒撤销及备份页恢复。
- 本地 favicon：使用 Chrome `_favicon` 缓存接口，不向图标服务上报书签域名。
- 常驻站点：可增删、排序，数据只保存在扩展设置中。
- 自定义搜索引擎：名称 + 含 `%s` 的 URL 模板，本地保存。
- JSON / Netscape HTML 导入导出、链接二维码、侧边栏快速访问。
- 中文 / English、浅色 / 深色 / 跟随系统、3 套设计主题与 6 种强调色。

## 安装

```bash
npm install
npm run build
```

然后打开 `chrome://extensions` 或 `edge://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，加载 `dist/`。

## 开发与校验

```bash
npm run typecheck
npm run build
npm run check:secrets
```

`build` 会生成 `dist/`，随后自动执行敏感串检查。

## 权限

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 展示、搜索、编辑、移动、导入导出用户书签 |
| `favicon` | 从浏览器本地缓存显示站点图标 |
| `storage` | 保存主题、搜索引擎、常驻站点及清理快照 |
| `history` | 在用户输入搜索词时提供浏览历史联想 |
| `contextMenus` | 提供复制链接、二维码、搜索和快捷入口 |
| `sidePanel` | 显示书签侧边栏 |
| `activeTab` + `scripting` | 仅在用户点击“复制当前页面/链接地址”菜单时写入剪贴板 |

扩展不申请 Cookie 权限或全域主机权限，也不会把书签上传到开发者服务器。天气卡在用户配置地点后直接请求 Open-Meteo；普通搜索会打开用户选定的搜索服务。

## 项目结构

```text
src/
  background/       浏览器菜单、快捷键、侧边栏协调
  components/       可复用界面与交互组件
  hooks/            书签树等共享状态
  lib/              书签、清理、备份、搜索与设置逻辑
  newtab/           新标签页应用
  popup/            扩展弹窗
  sidepanel/        浏览器侧边栏
```

隐私说明见 [PRIVACY.md](./PRIVACY.md)。
