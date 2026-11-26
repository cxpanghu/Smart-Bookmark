import { useState } from "react";
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Plus, Trash2, X } from "lucide-react";
import type { TopSite } from "@/types";
import SiteIcon from "@/components/SiteIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { hostnameOf } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface WidgetProps {
  sites: TopSite[];
  onChange: (sites: TopSite[]) => void | Promise<void>;
  onHide?: () => void | Promise<void>;
}

/**
 * 常驻快捷应用坞（Bento Dock）：
 * 采用统一磨砂玻璃托盘承载图标与名称，彻底解决任意复杂壁纸下裸露小字看不清的问题，
 * 并将尺寸精炼至单行紧凑排布，为下方书签翻页区留出充足视口空间。
 */
export default function TopSites({ sites, onChange, onHide }: WidgetProps) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const addSite = async () => {
    const site = validateSite(title, url, t);
    if (typeof site === "string") {
      setError(site);
      return;
    }
    await onChange([...sites, site]);
    setTitle("");
    setUrl("");
    setError("");
    setAdding(false);
  };

  return (
    <>
      <div className="bento-surface group/dock relative mx-auto w-fit max-w-full rounded-2xl px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-2.5">
          {sites.map((site, index) => (
            <div key={`${site.url}-${index}`} className="group/site relative w-[58px]">
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                title={site.url}
                className="flex flex-col items-center gap-1 rounded-xl py-0.5 transition hover:bg-accent/55 focus-visible:outline-none"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/85 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-transform duration-150 group-hover/site:-translate-y-0.5">
                  <SiteIcon
                    url={site.url}
                    title={site.title}
                    className="h-[22px] w-[22px] text-[10px]"
                  />
                </div>
                <div className="w-full px-0.5 truncate text-center text-[11px] font-medium leading-tight text-foreground/90">
                  {site.title || hostnameOf(site.url)}
                </div>
              </a>
              <button
                type="button"
                className="absolute right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground opacity-0 shadow-sm transition hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 group-hover/site:opacity-100"
                title={t("home.removeTopSite")}
                aria-label={t("home.removeTopSite")}
                onClick={() => onChange(sites.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            className="group/add flex w-[58px] flex-col items-center gap-1 rounded-xl py-0.5 text-muted-foreground transition hover:bg-accent/55 hover:text-foreground"
            onClick={() => setAdding(true)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-border/90 bg-background/45 transition group-hover/add:border-foreground/35 group-hover/add:text-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium leading-tight">
              {t("common.add")}
            </span>
          </button>

          {onHide && (
            <Tooltip
              content={t(
                "home.hideWidgetTooltip",
                t("home.widgetShort.topSites"),
              )}
              side="bottom"
              align="end"
            >
              <button
                type="button"
                onClick={() => void onHide()}
                aria-label={t("home.hideWidget")}
                className="flex w-[42px] flex-col items-center gap-1 rounded-xl py-0.5 text-muted-foreground/70 opacity-0 transition group-hover/dock:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
              >
                <span className="flex h-10 w-8 items-center justify-center rounded-xl border border-transparent transition">
                  <EyeOff className="h-3.5 w-3.5" />
                </span>
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                  {t("home.hideWidget")}
                </span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("home.addTopSite")}</DialogTitle>
            <DialogDescription>{t("home.addTopSiteHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder={t("home.topSiteTitle")}
            />
            <Input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addSite();
              }}
              placeholder="https://example.com/"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={addSite}>{t("common.add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TopSitesSettingsEditor({ sites, onChange }: WidgetProps) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sites.length || from === to) return;
    const next = [...sites];
    const [site] = next.splice(from, 1);
    next.splice(to, 0, site);
    void onChange(next);
  };

  const addSite = async () => {
    const site = validateSite(title, url, t);
    if (typeof site === "string") {
      setError(site);
      return;
    }
    await onChange([...sites, site]);
    setTitle("");
    setUrl("");
    setError("");
  };

  return (
    <div className="space-y-3.5">
      <div className="grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
        {sites.map((site, index) => (
          <div
            key={`${site.url}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
            className="group flex items-center gap-2 rounded-xl border border-border/75 bg-background/65 px-2.5 py-2 transition hover:border-border"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/60 group-hover:text-muted-foreground" />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
              <SiteIcon
                url={site.url}
                title={site.title}
                className="h-4 w-4 text-[9px]"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium leading-tight">{site.title}</div>
              <div className="truncate text-[10.5px] text-muted-foreground">{site.url}</div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={index === 0}
                title={t("common.moveUp")}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={index === sites.length - 1}
                title={t("common.moveDown")}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                title={t("common.delete")}
                onClick={() => onChange(sites.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 p-2.5 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_auto]">
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
          placeholder={t("home.topSiteTitle")}
        />
        <Input
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError("");
          }}
          placeholder="https://example.com/"
        />
        <Button type="button" variant="default" className="gap-1.5" onClick={addSite}>
          <Plus className="h-4 w-4" />
          {t("common.add")}
        </Button>
      </div>
      <p className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {error || t("home.topSitesReorderHint")}
      </p>
    </div>
  );
}

function validateSite(
  title: string,
  url: string,
  t: ReturnType<typeof useT>,
): TopSite | string {
  const normalizedTitle = title.trim();
  const normalizedUrl = url.trim();
  if (!normalizedTitle || !normalizedUrl) return t("home.topSiteRequired");
  try {
    const parsed = new URL(normalizedUrl);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
    return { title: normalizedTitle, url: parsed.toString() };
  } catch {
    return t("home.topSiteUrlInvalid");
  }
}
