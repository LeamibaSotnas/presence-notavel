import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onContact: () => void;
};

export function MobileMenu({ open, onClose, onContact }: MobileMenuProps) {
  const site = useSite();
  return (
    <div
      className={`actor-mobile-menu ${open ? "show" : ""}`}
      aria-hidden={!open}
    >
      <span className="mobile-kicker">Navigation / 01</span>

      {site.nav.map((item, index) => (
        <a key={item.href} href={item.href} onClick={onClose}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {item.label}
          <ArrowUpRight size={18} />
        </a>
      ))}

      <button
        type="button"
        onClick={() => {
          onClose();
          onContact();
        }}
      >
        <MessageCircle size={16} /> Fale comigo
      </button>
    </div>
  );
}
