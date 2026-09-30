import { ArrowUpRight } from "lucide-react";
import { type PortfolioItem } from "@/config/site.config";
import { useSite } from "@/contexts/SiteContext";
import { Overlay } from "./Overlay";

type ProjectDetailModalProps = {
  item: PortfolioItem | null;
  onClose: () => void;
  onContact: () => void;
};

export function ProjectDetailModal({
  item,
  onClose,
  onContact,
}: ProjectDetailModalProps) {
  const site = useSite();
  return (
    <Overlay open={item !== null} onClose={onClose} label="Detalhe do projeto">
      {item && (
        <div
          className="detail-modal"
          onClick={event => event.stopPropagation()}
        >
          <div className="detail-image">
            <img src={item.image} alt={`${item.title} — ${item.category}`} />
            <span>{item.badge}</span>
          </div>
          <div className="detail-copy">
            <span className="section-kicker peach-text">
              {item.category} · {item.year}
            </span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            {site.isDemo && (
              <span className="detail-note">
                Conteúdo demonstrativo — substituível por projeto real, marca,
                data, galeria e link.
              </span>
            )}
            <button type="button" className="peach-button" onClick={onContact}>
              Conversar sobre um projeto <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}
