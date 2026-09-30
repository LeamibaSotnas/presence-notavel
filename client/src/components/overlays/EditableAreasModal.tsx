import { Check, Sparkles } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { Overlay } from "./Overlay";

type EditableAreasModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EditableAreasModal({ open, onClose }: EditableAreasModalProps) {
  const site = useSite();
  const { adminConcept } = site;

  return (
    <Overlay open={open} onClose={onClose} label="Estrutura editável">
      <div className="admin-modal" onClick={event => event.stopPropagation()}>
        <span className="section-kicker peach-text">
          <Sparkles size={13} /> Futura gestão
        </span>
        <h2>
          {adminConcept.modalTitleLead}
          <br />
          <i>{adminConcept.modalTitleAccent}</i>
        </h2>
        <p>{adminConcept.modalBody}</p>
        <div className="editable-list">
          {adminConcept.editableAreas.map((area, index) => (
            <div key={area}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {area}
              <Check size={15} />
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
