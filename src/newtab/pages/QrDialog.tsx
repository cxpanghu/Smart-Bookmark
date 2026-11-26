import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toDataUrl } from "@/lib/qr";
import { useT } from "@/lib/i18n";
import { toast } from "@/components/ui/toast";

export default function QrDialog({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const t = useT();
  const [img, setImg] = useState<string>("");

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    toDataUrl(url, 320, dark).then(setImg);
  }, [url]);

  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = "qrcode.png";
    a.click();
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    toast(t("common.copied"), "success");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>{t("qr.title")}</DialogTitle>
          <DialogDescription
            className="truncate text-xs text-muted-foreground"
            title={url}
          >
            {url}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <div className="rounded-2xl border border-border/80 bg-white p-3.5 shadow-sm dark:bg-card">
            {img ? (
              <img
                src={img}
                alt="QR"
                className="block h-56 w-56 select-none rounded-lg"
                draggable={false}
              />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-lg bg-muted" />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyUrl}>
            <Copy className="h-3.5 w-3.5" /> {t("qr.copyUrl")}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={download}>
            <Download className="h-3.5 w-3.5" /> {t("qr.download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
