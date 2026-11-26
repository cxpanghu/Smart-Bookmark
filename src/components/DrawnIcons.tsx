import { useId } from "react";
import { cn, hostnameOf } from "@/lib/utils";

/**
 * 手绘高清 SVG 矢量品牌与搜索引擎图标库 + 无图标站点动态几何徽章绘制器。
 * 彻底解决未缓存站点显示浏览器默认灰地球（🌐）的问题。
 */

export function renderDrawnBrandSvg(
  urlOrHost: string,
  className?: string,
): JSX.Element | null {
  const host = extractCleanHost(urlOrHost);
  if (!host) return null;

  // Google
  if (host === "google.com" || host.endsWith(".google.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <path
          fill="#4285F4"
          d="M21.8 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.5Z"
        />
        <path
          fill="#34A853"
          d="M12 22.2c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.92-1.8-5.73-4.22H2.86v2.64A10.2 10.2 0 0 0 12 22.2Z"
        />
        <path
          fill="#FBBC05"
          d="M6.27 13.93a6.12 6.12 0 0 1 0-3.86V7.43H2.86a10.2 10.2 0 0 0 0 9.14l3.41-2.64Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.85c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.79 14.76 1.8 12 1.8A10.2 10.2 0 0 0 2.86 7.43l3.41 2.64C7.08 7.65 9.34 5.85 12 5.85Z"
        />
      </svg>
    );
  }

  // Bing
  if (host === "bing.com" || host.endsWith(".bing.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <defs>
          <linearGradient id="bing-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0089FA" />
            <stop offset="100%" stopColor="#00C4CC" />
          </linearGradient>
        </defs>
        <path
          fill="url(#bing-g)"
          d="M5.2 2.5 9.4 4v11.3l5.9-3.4-2.8-1.3L10.8 7l8.2 2.9v5.2L9.3 21.5 5.2 19V2.5Z"
        />
      </svg>
    );
  }

  // Baidu
  if (host === "baidu.com" || host.endsWith(".baidu.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#2932E1" />
        <ellipse cx="7.4" cy="8.4" rx="1.55" ry="2.1" fill="#fff" />
        <ellipse cx="10.4" cy="6.4" rx="1.45" ry="2.05" fill="#fff" />
        <ellipse cx="13.9" cy="6.5" rx="1.45" ry="2.05" fill="#fff" />
        <ellipse cx="16.8" cy="8.8" rx="1.55" ry="2.05" fill="#fff" />
        <path
          fill="#fff"
          d="M12.1 10.2c-2.2 0-3.7 1.85-4.7 3.25-1.05 1.45-.75 3.65 1.15 4.2 1.25.35 2.35-.15 3.45-.15 1.05 0 2.15.5 3.4.15 1.9-.55 2.2-2.75 1.15-4.2-1-1.4-2.35-3.25-4.45-3.25Z"
        />
      </svg>
    );
  }

  // DuckDuckGo
  if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#DE5833" />
        <path
          fill="#fff"
          d="M14.6 15.8c-.4-2.1-.6-4.7-.9-6.6-.3-2-1.8-3.3-3.7-3.1-1.9.2-3.1 1.8-2.8 3.8.2 1.2.8 2.1 1 3.5.3 1.6-.2 3.1-.2 4.3 1.9.8 4.4.8 6.6-1.9Z"
        />
        <path fill="#FED30A" d="M13.2 9.8c1.7-.2 3.6.2 4.1.9.4.6-.8 1.5-2.6 1.6-1.2.1-2-.4-2-.9 0-.6.1-1.5.5-1.6Z" />
        <circle cx="11.2" cy="8.7" r="0.75" fill="#1F2937" />
        <path fill="#4DABF7" d="m10.2 16.5 2.3 1.2 1.9-1.2-.5 2.2-1.4-.5-1.5.7-.8-2.4Z" />
      </svg>
    );
  }

  // GitHub
  if (host === "github.com" || host.endsWith(".github.com") || host.endsWith(".github.io")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0 text-foreground", className)} aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.475 2 2 6.588 2 12.253c0 4.532 2.862 8.374 6.838 9.73.5.094.687-.222.687-.493 0-.244-.01-1.05-.015-1.905-2.782.618-3.369-1.21-3.369-1.21-.454-1.184-1.11-1.499-1.11-1.499-.908-.636.069-.623.069-.623 1.004.072 1.532 1.057 1.532 1.057.892 1.566 2.341 1.114 2.91.852.091-.663.35-1.115.636-1.371-2.22-.259-4.555-1.14-4.555-5.068 0-1.12.39-2.035 1.03-2.752-.104-.26-.447-1.302.098-2.714 0 0 .84-.276 2.75 1.051A9.38 9.38 0 0 1 12 6.956c.85.004 1.705.118 2.504.346 1.909-1.327 2.747-1.051 2.747-1.051.547 1.412.204 2.454.1 2.714.64.717 1.028 1.632 1.028 2.752 0 3.938-2.339 4.806-4.566 5.06.359.317.678.944.678 1.902 0 1.373-.012 2.479-.012 2.817 0 .274.184.593.692.492C19.14 20.623 22 16.783 22 12.253 22 6.588 17.523 2 12 2Z"
        />
      </svg>
    );
  }

  // Stack Overflow
  if (host === "stackoverflow.com" || host.endsWith(".stackoverflow.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <path fill="#BCBBBB" d="M18.4 20.2v-5.4h1.8V22H3.8v-7.2h1.8v5.4h12.8Z" />
        <path
          fill="#F48024"
          d="m7.5 14.5 8.8 1.8.37-1.76-8.8-1.84-.37 1.8Zm1.16-4.2 8.15 3.8.75-1.63-8.15-3.8-.75 1.63Zm2.26-4 6.92 5.75 1.15-1.38-6.92-5.75-1.15 1.38ZM15.4 2l-1.44 1.08 5.36 7.2 1.44-1.08L15.4 2ZM7.3 18.4h9v-1.8h-9v1.8Z"
        />
      </svg>
    );
  }

  // MDN
  if (host === "developer.mozilla.org" || host.endsWith(".mozilla.org")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#1B1B1B" />
        <path
          fill="#83D0F2"
          d="M4.3 16.5 7.4 7.5h2l-3.1 9h-2Zm4.2 0V7.5h2v9h-2Zm3.6 0 3.1-9h2l-3.1 9h-2Zm4.3 0V7.5h2v9h-2Z"
        />
      </svg>
    );
  }

  // Cloudflare
  if (host === "cloudflare.com" || host.endsWith(".cloudflare.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <path
          fill="#F38020"
          d="M16.5 16.8h-11a3.5 3.5 0 0 1-.4-6.97 5.2 5.2 0 0 1 10.02-1.35A3.9 3.9 0 0 1 16.5 16.8Z"
        />
        <path
          fill="#FAAE40"
          d="M18.3 11.2c-.28 0-.55.04-.8.11a4.2 4.2 0 0 0-1.1 5.49h3.1a2.8 2.8 0 0 0-1.2-5.6Z"
        />
      </svg>
    );
  }

  // Discord
  if (host === "discord.com" || host.endsWith(".discord.com") || host === "discord.gg") {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#5865F2" />
        <path
          fill="#fff"
          d="M16.9 7.8A12.4 12.4 0 0 0 13.8 6.8l-.38.77a11.3 11.3 0 0 0-2.84 0L10.2 6.8a12.4 12.4 0 0 0-3.1 1C5.14 10.7 4.6 13.5 4.86 16.3a12.6 12.6 0 0 0 3.8 1.92l.82-1.12a8.1 8.1 0 0 1-1.28-.62l.31-.25c2.47 1.14 5.15 1.14 7.59 0l.31.25c-.41.25-.84.46-1.28.62l.82 1.12a12.5 12.5 0 0 0 3.8-1.92c.31-3.24-.53-6.02-2.85-8.5ZM9.65 14.5c-.74 0-1.35-.68-1.35-1.52 0-.84.6-1.52 1.35-1.52.76 0 1.36.68 1.35 1.52 0 .84-.6 1.52-1.35 1.52Zm4.7 0c-.74 0-1.35-.68-1.35-1.52 0-.84.6-1.52 1.35-1.52.76 0 1.36.68 1.35 1.52 0 .84-.59 1.52-1.35 1.52Z"
        />
      </svg>
    );
  }

  // Figma
  if (host === "figma.com" || host.endsWith(".figma.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <path fill="#F24E1E" d="M8.5 2h3.5v6.5H8.5a3.25 3.25 0 1 1 0-6.5Z" />
        <path fill="#FF7262" d="M12 2h3.5a3.25 3.25 0 1 1 0 6.5H12V2Z" />
        <path fill="#A259FF" d="M8.5 8.5H12V15H8.5a3.25 3.25 0 1 1 0-6.5Z" />
        <circle cx="15.25" cy="11.75" r="3.25" fill="#1ABCFE" />
        <path fill="#0ACF83" d="M8.5 15H12v3.25a3.25 3.25 0 1 1-3.5-3.25Z" />
      </svg>
    );
  }

  // Aliyun
  if (host === "aliyun.com" || host.endsWith(".aliyun.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#FF6A00" />
        <path
          fill="#fff"
          d="M7.2 7.5h9.6l2.4 4.5-2.4 4.5H7.2L4.8 12l2.4-4.5Zm1.3 2.1L7.1 12l1.4 2.4h7l1.4-2.4-1.4-2.4h-7Zm1.5 1.5h4v1.8h-4v-1.8Z"
        />
      </svg>
    );
  }

  // AWS / Lightsail
  if (host === "amazonaws.com" || host.endsWith(".amazonaws.com") || host.endsWith(".aws.amazon.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#232F3E" />
        <path
          fill="#FF9900"
          d="M5.2 14.9c3.8 2.4 9.7 2.5 13.4.2.35-.22.05-.56-.3-.42-3.8 1.5-8.9 1.4-12.8-.25-.35-.15-.65.25-.3.47Zm14.1-.8c-.3-.38-2-.18-2.75-.1-.23.03-.27-.17-.06-.32 1.35-.95 3.55-.68 3.8-.36.26.32-.07 2.54-1.33 3.6-.2.16-.38.07-.3-.14.28-.72.94-2.3.64-2.68Z"
        />
        <text x="12" y="12.2" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="system-ui, sans-serif">
          AWS
        </text>
      </svg>
    );
  }

  // Wise
  if (host === "wise.com" || host.endsWith(".wise.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#9FE870" />
        <path
          fill="#163300"
          d="M7.2 7.2h9.8l-4.5 9.8h-2.3l3.3-7.4H9.6l1.1 2.2H8.4L6.7 8.4l.5-1.2Z"
        />
      </svg>
    );
  }

  // Apple / App Store
  if (host === "apple.com" || host.endsWith(".apple.com")) {
    return (
      <svg viewBox="0 0 24 24" className={cn("shrink-0 text-foreground", className)} aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.52 12.66c.02 2.42 2.12 3.22 2.15 3.24-.02.06-.34 1.15-1.11 2.28-.67.98-1.37 1.95-2.46 1.97-1.08.02-1.42-.64-2.66-.64-1.23 0-1.62.62-2.64.66-1.06.04-1.87-1.06-2.55-2.03-1.38-2-2.44-5.64-1.02-8.11.71-1.23 1.97-2 3.34-2.03 1.04-.02 2.03.7 2.66.7.63 0 1.82-.87 3.07-.74.52.02 1.99.21 2.93 1.59-.08.05-1.75 1.02-1.71 3.11ZM14.5 6.66c.56-.68.94-1.62.84-2.56-.81.03-1.8.54-2.38 1.22-.52.6-.98 1.56-.86 2.48.91.07 1.84-.46 2.4-1.14Z"
        />
      </svg>
    );
  }

  return null;
}

/**
 * 动态几何渐变徽标：当站点无内置品牌图标且浏览器无真实 Favicon（或返回灰地球）时，
 * 绘制一枚带微渐变底板、玻璃顶高光与高对比字符的专属 SVG 图标。
 */
export function GeneratedSiteSvg({
  url,
  title,
  className,
}: {
  url: string;
  title?: string;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const host = extractCleanHost(url) || title || "site";

  let hash = 2166136261;
  for (let i = 0; i < host.length; i++) {
    hash ^= host.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const palette = BADGE_PALETTES[Math.abs(hash) % BADGE_PALETTES.length];
  const glyph = pickGlyph(title, host);

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={`url(#bg-${uid})`} />
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="8"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.24"
      />
      <circle cx="25" cy="7" r="7" fill="#ffffff" fillOpacity="0.1" />
      <text
        x="16"
        y="16.8"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={glyph.length > 1 ? "12.5" : "15"}
        fontWeight="700"
        fontFamily="Inter Variable, Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
      >
        {glyph}
      </text>
    </svg>
  );
}

const BADGE_PALETTES: ReadonlyArray<[string, string]> = [
  ["#3B82F6", "#1D4ED8"], // 钴蓝
  ["#10B981", "#047857"], // 翠绿
  ["#F59E0B", "#D97706"], // 琥珀
  ["#EC4899", "#BE185D"], // 玫瑰
  ["#6366F1", "#4338CA"], // 靛蓝
  ["#06B6D4", "#0E7490"], // 青碧
  ["#8B5CF6", "#6D28D9"], // 紫罗兰
  ["#EF4444", "#B91C1C"], // 绯红
  ["#14B8A6", "#0F766E"], // 松石
  ["#475569", "#1E293B"], // 石板灰
];

function extractCleanHost(urlOrHost: string): string {
  const raw = urlOrHost.trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("://")) {
    return hostnameOf(raw).toLowerCase();
  }
  return raw.replace(/^www\./, "").split("/")[0] ?? "";
}

function pickGlyph(title: string | undefined, host: string): string {
  const cleanTitle = (title ?? "").trim();
  // 优先提取标题首个有意义的字母或汉字（跳过纯标点/Emoji）
  const matchTitle = cleanTitle.match(/[\p{L}\p{N}]/u);
  if (matchTitle) {
    const ch = matchTitle[0]!;
    if (/^[a-zA-Z0-9]$/.test(ch)) {
      const two = cleanTitle.match(/^[a-zA-Z]{2}/);
      return two ? two[0][0]!.toUpperCase() + two[0][1]!.toLowerCase() : ch.toUpperCase();
    }
    return ch;
  }
  const core = host.split(".")[0] ?? host;
  if (core.length >= 2 && /^[a-z0-9]+$/i.test(core)) {
    return core[0]!.toUpperCase() + core[1]!.toLowerCase();
  }
  return (core[0] ?? "•").toUpperCase();
}
