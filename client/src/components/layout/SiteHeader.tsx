import { MessageCircle, Menu, X } from "lucide-react";
import { siteConfig } from "@/config/site.config";
import { BrandMark } from "./BrandMark";

type SiteHeaderProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onContact: () => void;
};

export function SiteHeader({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onContact,
}: SiteHeaderProps) {
  return (
    <header className={`actor-header ${menuOpen ? "menu-on" : ""}`}>
      <BrandMark onClick={onCloseMenu} />

      <nav aria-label="Navegação principal">
        {siteConfig.nav.map(item => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <button type="button" className="header-cta" onClick={onContact}>
        <MessageCircle size={15} /> Fale comigo
      </button>

      <button
        type="button"
        className="mobile-toggle"
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
    </header>
  );
}
