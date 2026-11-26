import type { Settings } from "@/types";
import { getSettings, onSettingsChange } from "@/lib/storage";

export function resolveTheme(mode: Settings["theme"]): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(mode: Settings["theme"]) {
  const theme = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  // 清除旧版遗留的主题预设属性
  delete root.dataset.accent;
  delete root.dataset.themePreset;
}

export async function initTheme() {
  const s = await getSettings();
  applyTheme(s.theme);
  onSettingsChange((next) => {
    applyTheme(next.theme);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async () => {
    const cur = await getSettings();
    if (cur.theme === "system") applyTheme("system");
  });
}
