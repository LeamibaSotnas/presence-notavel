import { ArrowUpRight, Sparkles } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";

type AdminConceptSectionProps = {
  onOpen: () => void;
};

export function AdminConceptSection({ onOpen }: AdminConceptSectionProps) {
  const site = useSite();
  const { adminConcept } = site;

  return (
    <section className="admin-concept">
      <div className="container admin-inner">
        <div>
          <span className="section-kicker peach-text">
            <Sparkles size={13} /> {adminConcept.kicker}
          </span>
          <h2>
            {adminConcept.titleLead}
            <br />
            <i>{adminConcept.titleAccent}</i>
          </h2>
          <p>{adminConcept.body}</p>
        </div>
        <button type="button" className="outline-peach" onClick={onOpen}>
          {adminConcept.ctaLabel} <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}
