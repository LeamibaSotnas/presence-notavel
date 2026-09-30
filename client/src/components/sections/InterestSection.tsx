import { useRef, useState } from "react";
import { ArrowUpRight, Check, Loader2, MessageCircle } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { ApiError, leads } from "@/lib/api";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Campo de interesse: a captação de leads da página.
 *
 * O envio salva o contato no painel e, se `interest.redirectToWhatsApp` estiver
 * ligado e houver número configurado, abre o WhatsApp com a mensagem já
 * preenchida. Essa ordem importa: o lead fica registrado mesmo que a pessoa
 * desista de abrir o WhatsApp.
 */
export function InterestSection() {
  const site = useSite();
  const { interest, contact } = site;

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    subject: interest.subjects[0]?.value ?? "",
    message: "",
    consent: false,
    website: "", // honeypot
  });

  // Marca quando o formulário apareceu: envio instantâneo é bot.
  const mountedAt = useRef(Date.now());

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm(current => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      await leads.submit({
        name: form.name,
        contact: form.contact,
        subject:
          interest.subjects.find(s => s.value === form.subject)?.label ??
          form.subject,
        message: form.message,
        consent: form.consent,
        elapsedMs: Date.now() - mountedAt.current,
        website: form.website || undefined,
        sourcePath: window.location.pathname,
      });

      setStatus("sent");

      if (interest.redirectToWhatsApp && contact.whatsapp) {
        const text = [
          `Olá, sou ${form.name}.`,
          interest.subjects.find(s => s.value === form.subject)?.label,
          form.message,
        ]
          .filter(Boolean)
          .join(" ");
        window.open(
          `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível enviar agora. Tente novamente em instantes."
      );
    }
  }

  if (status === "sent") {
    return (
      <section className="interest-section" id="interesse">
        <div className="container interest-done">
          <span className="interest-check" aria-hidden="true">
            <Check size={26} />
          </span>
          <h2>{interest.successTitle}</h2>
          <p>{interest.successBody}</p>
          {contact.whatsapp && (
            <button
              type="button"
              className="peach-button"
              onClick={() =>
                window.open(
                  `https://wa.me/${contact.whatsapp}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <MessageCircle size={15} /> Abrir o WhatsApp
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="interest-section" id="interesse">
      <div className="container interest-grid">
        <div className="interest-copy">
          <span className="section-kicker peach-text">{interest.kicker}</span>
          <h2>
            {interest.titleLead}
            <br />
            <i>{interest.titleAccent}</i>
          </h2>
          <p>{interest.intro}</p>
        </div>

        <form className="interest-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="interest-name">Nome</label>
            <input
              id="interest-name"
              name="name"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              value={form.name}
              onChange={event => update("name", event.target.value)}
              placeholder="Como devo te chamar"
            />
          </div>

          <div className="field">
            <label htmlFor="interest-contact">WhatsApp ou e-mail</label>
            <input
              id="interest-contact"
              name="contact"
              type="text"
              required
              maxLength={160}
              autoComplete="tel"
              value={form.contact}
              onChange={event => update("contact", event.target.value)}
              placeholder="(11) 90000-0000 ou voce@email.com"
            />
          </div>

          <div className="field">
            <label htmlFor="interest-subject">Assunto</label>
            <select
              id="interest-subject"
              name="subject"
              value={form.subject}
              onChange={event => update("subject", event.target.value)}
            >
              {interest.subjects.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="interest-message">Mensagem</label>
            <textarea
              id="interest-message"
              name="message"
              required
              rows={4}
              maxLength={2000}
              value={form.message}
              onChange={event => update("message", event.target.value)}
              placeholder="Conte sobre o projeto, a data e o formato."
            />
          </div>

          {/* Honeypot: invisível para pessoas, irresistível para bots. */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="interest-website">Website</label>
            <input
              id="interest-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={event => update("website", event.target.value)}
            />
          </div>

          <label className="consent">
            <input
              type="checkbox"
              required
              checked={form.consent}
              onChange={event => update("consent", event.target.checked)}
            />
            <span>{interest.privacyNotice}</span>
          </label>

          {error && (
            <p className="interest-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="peach-button wide"
            disabled={status === "sending"}
          >
            {status === "sending" ? (
              <>
                <Loader2 size={15} className="spin" /> Enviando
              </>
            ) : (
              <>
                Enviar mensagem <ArrowUpRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
