import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface ToastItem {
  id: number;
  text: string;
  kind?: "info" | "success" | "error";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
}

let push: (t: Omit<ToastItem, "id">) => void = () => {};

export function toast(
  text: string,
  kind: ToastItem["kind"] = "info",
  options?: Pick<ToastItem, "duration" | "action">,
) {
  push({ text, kind, ...options });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { ...t, id }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, t.duration ?? 2400);
    };
    return () => {
      push = () => {};
    };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => {
        const Icon =
          t.kind === "error"
            ? AlertCircle
            : t.kind === "success"
              ? CheckCircle2
              : Info;
        const iconTone =
          t.kind === "error"
            ? "text-destructive"
            : t.kind === "success"
              ? "text-emerald-500"
              : "text-primary";
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border/85 bg-popover/95 px-3.5 py-2 text-[13px] font-medium text-popover-foreground shadow-xl shadow-black/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 dark:shadow-black/40"
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} />
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="ml-1.5 rounded-md bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                onClick={async () => {
                  await t.action?.onClick();
                  setItems((prev) => prev.filter((item) => item.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
