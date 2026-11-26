# Smart Bookmark：把书签真正变成可维护的工作台

浏览器书签很容易从“稍后再看”变成几千条无法整理的库存。Smart Bookmark 是一个本地优先的 Chrome / Edge MV3 扩展，把浏览、搜索、整理、清理和备份集中到新标签页。

## 它解决什么

### 更快找到内容

看板支持文件夹导航、模糊排序、浏览历史联想、键盘选择和响应式卡片布局。常驻站点与默认搜索引擎都可以配置；私有搜索服务可作为含 `%s` 占位符的自定义引擎保存在本机。

### 不离开页面也能管理

书签右键菜单支持改名、修改 URL、移动、二维码和删除。文件夹可新建、重命名和删除，书签树会实时刷新。

### 清理时留有退路

清理中心检查重复书签、空文件夹和异常 URL。扫描动作位于首屏，画像默认折叠。每次删除前都会创建本地快照，30 秒内可撤销，也可稍后到备份页恢复。

### 图标与数据更克制

站点图标直接使用 Chrome 的本地 `_favicon` 缓存，不再逐个请求远程图标服务。扩展不申请 Cookie 权限或全域主机权限，也没有在所有网站常驻注入的脚本。

### 备份与跨设备迁移

支持 JSON 和 Netscape HTML 导入导出。导入只新增内容，重复 URL 会跳过，不会覆盖现有书签。

## 安装

```bash
git clone <repository-url>
cd Smart-Bookmark
npm install
npm run build
```

在 `chrome://extensions` 或 `edge://extensions` 打开开发者模式，加载生成的 `dist/` 目录即可。

## 技术栈

- React 18 + TypeScript
- Vite + Tailwind CSS
- Chrome Extension Manifest V3
- Radix UI + Lucide Icons

项目的构建链会在生成 `dist/` 后运行敏感串检查，避免本地定制误入发布产物。
