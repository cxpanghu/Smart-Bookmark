import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import SettingsPage, { type SettingsSectionId } from "./pages/Settings";
import QrDialog from "./pages/QrDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { getSettings, onSettingsChange } from "@/lib/storage";
import type { Settings } from "@/types";
import { useT } from "@/lib/i18n";
import { ToastHost } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type RouteView =
  | { mode: "dashboard" }
  | { mode: "settings"; section: SettingsSectionId };

function readHashRoute(): RouteView {
  const h = window.location.hash.slice(1);
  const params = new URLSearchParams(h);
  const tab = params.get("tab");
  const sectionParam = params.get("section") as SettingsSectionId | null;

  if (tab === "cleaner") {
    return { mode: "settings", section: "cleaner" };
  }
  if (tab === "backup") {
    return { mode: "settings", section: "backup" };
  }
  if (tab === "settings") {
    const validSections: SettingsSectionId[] = [
      "general",
      "search",
      "widgets",
      "cleaner",
      "backup",
    ];
    const section =
      sectionParam && validSections.includes(sectionParam)
        ? sectionParam
        : "general";
    return { mode: "settings", section };
  }
  return { mode: "dashboard" };
}

function readHashParam(key: string): string {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get(key) ?? "";
}

export default function App() {
  const t = useT();
  const [route, setRoute] = useState<RouteView>(readHashRoute);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [initialQuery] = useState(() => readHashParam("q"));
  const [qr, setQr] = useState<string>(() => readHashParam("qr"));

  const navigateDashboard = useCallback(() => {
    setRoute({ mode: "dashboard" });
    const p = new URLSearchParams(window.location.hash.slice(1));
    p.delete("tab");
    p.delete("section");
    const s = p.toString();
    window.history.replaceState(null, "", s ? "#" + s : window.location.pathname);
  }, []);

  const navigateSettings = useCallback((section: SettingsSectionId = "general") => {
    setRoute({ mode: "settings", section });
    const p = new URLSearchParams(window.location.hash.slice(1));
    if (section === "cleaner") {
      p.set("tab", "cleaner");
      p.delete("section");
    } else if (section === "backup") {
      p.set("tab", "backup");
      p.delete("section");
    } else {
      p.set("tab", "settings");
      if (section === "general") p.delete("section");
      else p.set("section", section);
    }
    window.location.hash = "#" + p.toString();
  }, []);

  useEffect(() => {
    getSettings().then(setSettings);
    const off = onSettingsChange(setSettings);
    const onHash = () => {
      setRoute(readHashRoute());
      setQr(readHashParam("qr"));
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      off();
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const hasWallpaper = Boolean(settings?.wallpaper);
  const bgStyle = useMemo(() => {
    if (!settings?.wallpaper) return undefined;
    return { backgroundImage: `url(${JSON.stringify(settings.wallpaper)})` };
  }, [settings?.wallpaper]);

  if (!settings) return null;

  const isDashboard = route.mode === "dashboard";

  return (
    <div
      data-wallpaper={hasWallpaper ? "true" : "false"}
      className="relative h-screen w-screen overflow-hidden"
    >
      {/* 独立壁纸层 + 明暗自适应防护遮罩 */}
      {hasWallpaper && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={bgStyle}
          />
          <div
            aria-hidden
            className="wallpaper-scrim pointer-events-none fixed inset-0 z-0"
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 flex h-full flex-col",
          !hasWallpaper && "bg-background",
        )}
      >
        {/* 主页右上角隐藏式悬浮触发坞：常态完全隐形，鼠标移至右上角热区平滑浮现 */}
        {isDashboard && (
          <div className="group/corner fixed right-0 top-0 z-40 pl-10 pb-8 pr-4 pt-3.5">
            <div className="bento-surface pointer-events-none flex translate-y-[-4px] items-center gap-1 rounded-full p-1 opacity-0 shadow-lg transition-all duration-200 ease-out group-hover/corner:pointer-events-auto group-hover/corner:translate-y-0 group-hover/corner:opacity-100 focus-within:pointer-events-auto focus-within:translate-y-0 focus-within:opacity-100">
              <ThemeToggle
                variant="icon"
                className="h-7 w-7 rounded-full border-0 bg-transparent shadow-none hover:bg-accent"
              />
              <button
                type="button"
                onClick={() => navigateSettings("general")}
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-foreground/85 transition hover:bg-accent hover:text-foreground"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>{t("tabs.settings")}</span>
              </button>
            </div>
          </div>
        )}

        <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "mx-auto h-full w-full max-w-[1660px] px-4 sm:px-6 lg:px-8",
              isDashboard ? "py-4 lg:py-5" : "py-5 lg:py-6",
            )}
          >
            {isDashboard ? (
              <Dashboard
                settings={settings}
                initialQuery={initialQuery}
              />
            ) : (
              <SettingsPage
                section={route.section}
                onSectionChange={navigateSettings}
                onBack={navigateDashboard}
              />
            )}
          </div>
        </main>
      </div>

      {qr && (
        <QrDialog
          url={qr}
          onClose={() => {
            setQr("");
            const params = new URLSearchParams(window.location.hash.slice(1));
            params.delete("qr");
            const s = params.toString();
            window.history.replaceState(null, "", s ? "#" + s : window.location.pathname);
          }}
        />
      )}

      <ToastHost />
    </div>
  );
}
