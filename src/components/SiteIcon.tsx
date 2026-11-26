import { useEffect, useState } from "react";
import { getBrandIconUrl } from "@/components/BrandIcons";
import { GeneratedSiteSvg, renderDrawnBrandSvg } from "@/components/DrawnIcons";
import { cn, faviconOf } from "@/lib/utils";

interface Props {
  url: string;
  title?: string;
  src?: string;
  size?: number;
  className?: string;
}

/**
 * 采样 16x16 图像的像素指纹，用于精准识别 Chrome / Edge `/_favicon/` 返回的默认灰地球占位图。
 */
function computeImageSignature(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let hash = 2166136261;
    let colorfulPixels = 0;
    let opaquePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      hash ^= (r << 16) ^ (g << 8) ^ b ^ a;
      hash = Math.imul(hash, 16777619);
      if (a > 40) {
        opaquePixels++;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min > 18) colorfulPixels++;
      }
    }
    // 完全空白图也视为无效图标
    if (opaquePixels === 0) return "EMPTY";
    return `${hash >>> 0}:${colorfulPixels}`;
  } catch {
    return null;
  }
}

let defaultGlobeSigPromise: Promise<string | null> | null = null;
const globeVerdictCache = new Map<string, boolean>();

function getDefaultGlobeSignature(): Promise<string | null> {
  if (defaultGlobeSigPromise) return defaultGlobeSigPromise;
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.getURL ||
    !chrome.runtime?.id
  ) {
    defaultGlobeSigPromise = Promise.resolve(null);
    return defaultGlobeSigPromise;
  }
  defaultGlobeSigPromise = new Promise((resolve) => {
    const probeUrl = new URL(chrome.runtime.getURL("/_favicon/"));
    probeUrl.searchParams.set("pageUrl", "https://unvisited-default-globe.invalid/");
    probeUrl.searchParams.set("size", "32");
    const img = new Image();
    img.onload = () => resolve(computeImageSignature(img));
    img.onerror = () => resolve(null);
    img.src = probeUrl.toString();
  });
  return defaultGlobeSigPromise;
}

export default function SiteIcon({
  url,
  title = "",
  src,
  size = 32,
  className,
}: Props) {
  // 1. 最高优先级：本地高清品牌 PNG（public/brand-icons）
  const brandPng = src ? null : getBrandIconUrl(url);
  // 2. 第二优先级：手绘高清矢量品牌/搜索引擎 SVG（Google / Bing / Baidu / GitHub / Cloudflare 等）
  const drawnBrand = !brandPng ? renderDrawnBrandSvg(url, className) : null;

  // 3. 第三优先级：浏览器缓存的真实站点 Favicon（自动检测并剔除默认灰地球）
  const candidateSrc = brandPng ?? (drawnBrand ? "" : src ?? faviconOf(url, size));
  const [rejected, setRejected] = useState(
    () => !candidateSrc || globeVerdictCache.get(candidateSrc) === true,
  );

  useEffect(() => {
    if (!candidateSrc) {
      setRejected(true);
      return;
    }
    setRejected(globeVerdictCache.get(candidateSrc) === true);
  }, [candidateSrc]);

  if (drawnBrand) {
    return drawnBrand;
  }

  if (!rejected && candidateSrc) {
    return (
      <img
        src={candidateSrc}
        alt=""
        className={cn("shrink-0 rounded-[4px] object-contain", className)}
        onLoad={(event) => {
          if (brandPng || !candidateSrc.includes("/_favicon/")) return;
          if (globeVerdictCache.has(candidateSrc)) {
            if (globeVerdictCache.get(candidateSrc)) setRejected(true);
            return;
          }
          const imgEl = event.currentTarget;
          const sig = computeImageSignature(imgEl);
          if (sig === "EMPTY") {
            globeVerdictCache.set(candidateSrc, true);
            setRejected(true);
            return;
          }
          if (!sig) return;
          void getDefaultGlobeSignature().then((globeSig) => {
            if (globeSig && sig === globeSig) {
              globeVerdictCache.set(candidateSrc, true);
              setRejected(true);
            } else {
              globeVerdictCache.set(candidateSrc, false);
            }
          });
        }}
        onError={() => {
          if (candidateSrc) globeVerdictCache.set(candidateSrc, true);
          setRejected(true);
        }}
      />
    );
  }

  // 4. 兜底绘制：精致双色微渐变 SVG 站点徽章
  return <GeneratedSiteSvg url={url} title={title} className={className} />;
}
