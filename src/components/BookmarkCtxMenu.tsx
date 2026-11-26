import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  FolderInput,
  Pencil,
  QrCode,
  Trash2,
} from "lucide-react";
import { useT } from "@/lib/i18n";

export interface MenuAnchor {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface BookmarkMenuProps {
  anchor: MenuAnchor;
  onCopy: () => void;
  onQr: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BookmarkCtxMenu(props: BookmarkMenuProps) {
  const t = useT();
  return (
    <PositionedMenu anchor={props.anchor} onClose={props.onClose}>
      <MenuItem icon={Copy} label={t("bookmark.copyLink")} onClick={props.onCopy} />
      <MenuItem icon={QrCode} label={t("bookmark.qrCode")} onClick={props.onQr} />
      <MenuItem icon={Pencil} label={t("bookmark.edit")} onClick={props.onEdit} />
      <MenuItem icon={FolderInput} label={t("bookmark.move")} onClick={props.onMove} />
      <div className="my-1 h-px bg-border/70" />
      <MenuItem
        icon={Trash2}
        label={t("bookmark.delete")}
        onClick={props.onDelete}
        destructive
      />
    </PositionedMenu>
  );
}

export function FolderCtxMenu({
  anchor,
  onRename,
  onDelete,
  onClose,
}: {
  anchor: MenuAnchor;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <PositionedMenu anchor={anchor} onClose={onClose}>
      <MenuItem icon={Pencil} label={t("folder.rename")} onClick={onRename} />
      <div className="my-1 h-px bg-border/70" />
      <MenuItem
        icon={Trash2}
        label={t("folder.delete")}
        onClick={onDelete}
        destructive
      />
    </PositionedMenu>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors " +
        (destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-popover-foreground hover:bg-accent")
      }
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 opacity-80" />
      <span>{label}</span>
    </button>
  );
}

function PositionedMenu({
  anchor,
  onClose,
  children,
}: {
  anchor: MenuAnchor;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchor.right, top: anchor.bottom + 6 });

  useEffect(() => {
    const place = () => {
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const padding = 8;
      const gap = 6;
      const left = Math.min(
        Math.max(padding, anchor.right - rect.width),
        Math.max(padding, window.innerWidth - rect.width - padding),
      );
      const below = anchor.bottom + gap;
      const above = anchor.top - rect.height - gap;
      const top =
        below + rect.height + padding <= window.innerHeight
          ? below
          : Math.max(padding, above);
      setPos({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      onClick={(event) => event.stopPropagation()}
      className="popover-surface fixed z-[60] min-w-[184px] rounded-xl p-1.5 animate-in fade-in zoom-in-95"
      style={{ left: pos.left, top: pos.top }}
    >
      {children}
    </div>,
    document.body,
  );
}
