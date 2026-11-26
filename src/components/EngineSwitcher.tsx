import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Settings2 } from "lucide-react";
import { allEngines } from "@/lib/engines";
import type { Settings } from "@/types";
import { cn } from "@/lib/utils";
import SiteIcon from "@/components/SiteIcon";
import { useT } from "@/lib/i18n";

interface Props {
  settings: Settings;
  value: string;
  onChange: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export default function EngineSwitcher({
  settings,
  value,
  onChange,
  onOpenChange,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const setSwitcherOpen = useCallback((next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open, setSwitcherOpen]);

  const engines = allEngines(settings);
  const current = engines.find((e) => e.id === value) ?? engines[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setSwitcherOpen(!open)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition",
          open
            ? "bg-accent text-foreground"
            : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        title={t("engine.switch")}
      >
        {current && (
          <SiteIcon
            url={`https://${current.host}/`}
            title={current.name}
            className="h-4 w-4 text-[9px]"
          />
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className="popover-surface absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[320px] rounded-2xl p-2.5 animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {engines.map((engine) => {
              const active = value === engine.id;
              return (
                <button
                  key={engine.id}
                  type="button"
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition",
                    active
                      ? "bg-accent text-foreground ring-1 ring-inset ring-foreground/20"
                      : "text-foreground/85 hover:bg-accent/65",
                  )}
                  onClick={() => {
                    onChange(engine.id);
                    setSwitcherOpen(false);
                  }}
                >
                  {active && (
                    <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-foreground" />
                  )}
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card shadow-sm">
                    <SiteIcon
                      url={`https://${engine.host}/`}
                      title={engine.name}
                      className="h-4 w-4 text-[10px]"
                    />
                  </span>
                  <span className="max-w-full truncate text-[11px] font-medium">
                    {engine.name}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#tab=settings&section=search";
              setSwitcherOpen(false);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-border/60 pt-2.5 pb-0.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t("engine.manage")}
          </button>
        </div>
      )}
    </div>
  );
}
