import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { getSettings, onSettingsChange, setSettings } from "@/lib/storage";
import type { Settings } from "@/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "button" | "icon";
  className?: string;
}

export default function ThemeToggle({
  variant = "button",
  className,
}: ThemeToggleProps) {
  const t = useT();
  const [theme, setTheme] = useState<Settings["theme"]>("system");
  useEffect(() => {
    getSettings().then((s) => setTheme(s.theme));
    return onSettingsChange((s) => setTheme(s.theme));
  }, []);

  const cycle = async () => {
    const next: Settings["theme"] =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    await setSettings({ theme: next });
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label =
    theme === "light"
      ? t("settings.themeLight")
      : theme === "dark"
        ? t("settings.themeDark")
        : t("settings.themeAuto");

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card/80 text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-border hover:bg-accent hover:text-foreground",
          className,
        )}
        title={t("settings.themeCycle", label)}
        aria-label={t("settings.themeCycle", label)}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-card/80 px-2.5 text-xs font-medium text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-border hover:bg-accent hover:text-foreground",
        className,
      )}
      title={t("settings.themeCycle", label)}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
