/**
 * 内置品牌图标：常见站点的官方 favicon（一次性抓取存于 public/brand-icons/，128px PNG）。
 * 供 SiteIcon 作为最高优先级图标源；未收录域名回退浏览器 favicon 缓存 / 字母块。
 * 新增站点：把官方图标 PNG 放入 public/brand-icons/，在 BRAND_HOSTS 登记域名即可。
 */

const BRAND_HOSTS: Record<string, string> = {
  "chatgpt.com": "chatgpt.com.png",
  "chat.openai.com": "chatgpt.com.png",
  "gemini.google.com": "gemini.google.com.png",
  "claude.ai": "claude.ai.png",
  "mail.google.com": "mail.google.com.png",
  "mail.qq.com": "mail.qq.com.png",
  "xiaohongshu.com": "xiaohongshu.com.png",
  "doubao.com": "doubao.com.png",
  "nga.cn": "bbs.nga.cn.png",
  "bbs.nga.cn": "bbs.nga.cn.png",
  "ngabbs.com": "bbs.nga.cn.png",
  "linux.do": "linux.do.png",
  "youtube.com": "youtube.com.png",
  "youtu.be": "youtube.com.png",
  "bilibili.com": "bilibili.com.png",
  "b23.tv": "bilibili.com.png",
  "x.com": "x.com.png",
  "twitter.com": "x.com.png",
  "grok.com": "grok.com.png",
};

const canResolve =
  typeof chrome !== "undefined" && !!chrome.runtime?.getURL && !!chrome.runtime?.id;

/** 命中内置品牌图标则返回其本地资源 URL，否则返回 null（继续走 favicon/字母块兜底）。 */
export function getBrandIconUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    const file = BRAND_HOSTS[host];
    if (!file) return null;
    return canResolve
      ? chrome.runtime.getURL(`brand-icons/${file}`)
      : `/brand-icons/${file}`;
  } catch {
    return null;
  }
}
