import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Classe extra no wrapper (ex.: "lightbox"). */
  variant?: string;
  label: string;
};

/**
 * Base compartilhada por lightbox e modais: backdrop clicável,
 * botão de fechar, trava de scroll e fechamento por Escape.
 */
export function Overlay({
  open,
  onClose,
  children,
  variant = "",
  label,
}: OverlayProps) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`overlay ${variant}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        className="overlay-close"
        onClick={onClose}
        aria-label="Fechar"
      >
        <X />
      </button>
      {children}
    </div>
  );
}
