import {
  ArrowUpRight,
  Check,
  Instagram,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { useContactActions } from "@/hooks/useContactActions";

type ContactSectionProps = ReturnType<typeof useContactActions>;

export function ContactSection({
  openWhatsApp,
  openInstagram,
  openEmail,
  showConfigNotice,
  hasInstagram,
  hasEmail,
}: ContactSectionProps) {
  const site = useSite();
  const { contactSection } = site;
  const [panelLead, panelTail] = contactSection.panelTitle.split("\n");

  return (
    <section className="contact-section" id="contato">
      <div className="contact-glow" />
      <div className="container contact-inner">
        <div>
          <span className="section-kicker peach-text">
            {contactSection.kicker}
          </span>
          <h2>
            {contactSection.titleLead}
            <br />
            <i>{contactSection.titleAccent}</i>
          </h2>
          <p>{contactSection.lead}</p>

          <div className="socials">
            <button type="button" onClick={openWhatsApp}>
              <MessageCircle size={17} /> WhatsApp
            </button>
            {hasInstagram ? (
              <button type="button" onClick={openInstagram}>
                <Instagram size={17} /> Instagram
              </button>
            ) : (
              <span>
                <Instagram size={17} /> Instagram
              </span>
            )}
            {hasEmail ? (
              <button type="button" onClick={openEmail}>
                <Mail size={17} /> E-mail
              </button>
            ) : (
              <span>
                <Mail size={17} /> E-mail
              </span>
            )}
          </div>
        </div>

        <div className="contact-panel">
          <span className="panel-kicker">{contactSection.panelKicker}</span>
          <h3>
            {panelLead}
            <br />
            {panelTail}
          </h3>
          <button
            type="button"
            className="peach-button wide"
            onClick={openWhatsApp}
          >
            Fale pelo WhatsApp <ArrowUpRight size={16} />
          </button>
          <small>{contactSection.panelNote}</small>

          {showConfigNotice && (
            <div className="config-notice" role="status">
              <Check size={15} /> Preencha os canais de contato em
              client/src/config/site.config.ts para ativar estes botões.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
