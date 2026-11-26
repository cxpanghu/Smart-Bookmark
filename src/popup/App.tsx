import {
  Bookmark,
  ChevronRight,
  HardDriveDownload,
  PanelRight,
  Settings2,
  Wand2,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";

export default function Popup() {
  const t = useT();
  const openNewtab = (hash = "") => {
    chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html" + hash) });
    window.close();
  };

  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId) {
      await chrome.sidePanel?.open?.({ windowId: tab.windowId }).catch(() => {});
      window.close();
    }
  };

  const Item = ({
    icon,
    label,
    desc,
    onClick,
    tone,
  }: {
    icon: React.ReactNode;
    label: string;
    desc: string;
    onClick: () => void;
    tone: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="bento-surface group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:border-foreground/30 hover:bg-accent/35"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {desc}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  );

  return (
    <div className="w-[312px] bg-background p-3.5 text-foreground">
      <header className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-foreground text-background shadow-sm">
            <Bookmark className="h-3.5 w-3.5" strokeWidth={2.2} />
          </div>
          <span className="text-[13.5px] font-semibold tracking-tight">
            {t("app.title")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="icon" className="h-7 w-7" />
          <button
            type="button"
            onClick={() => openNewtab("#tab=settings")}
            title={t("tabs.settings")}
            aria-label={t("tabs.settings")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card/80 text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="space-y-1.5">
        <Item
          icon={<Bookmark className="h-4 w-4" />}
          tone="bg-muted text-foreground"
          label={t("popup.dashboard")}
          desc={t("popup.dashboardDesc")}
          onClick={() => openNewtab()}
        />
        <Item
          icon={<PanelRight className="h-4 w-4" />}
          tone="bg-sky-500/12 text-sky-600 dark:text-sky-400"
          label={t("popup.sidepanel")}
          desc={t("popup.sidepanelDesc")}
          onClick={openSidePanel}
        />
        <Item
          icon={<Wand2 className="h-4 w-4" />}
          tone="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
          label={t("popup.cleaner")}
          desc={t("popup.cleanerDesc")}
          onClick={() => openNewtab("#tab=cleaner")}
        />
        <Item
          icon={<HardDriveDownload className="h-4 w-4" />}
          tone="bg-amber-500/12 text-amber-600 dark:text-amber-400"
          label={t("popup.backup")}
          desc={t("popup.backupDesc")}
          onClick={() => openNewtab("#tab=backup")}
        />
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/45 px-2.5 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd-cap">Alt+B</kbd>
          <span>{t("popup.sidepanelKey")}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd-cap">Alt+Shift+C</kbd>
          <span>{t("popup.cleanerKey")}</span>
        </span>
      </footer>
    </div>
  );
}
