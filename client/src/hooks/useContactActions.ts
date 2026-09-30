import { useCallback, useState } from "react";
import { siteConfig } from "@/config/site.config";

/**
 * Centraliza os canais de contato.
 *
 * Quando `siteConfig.contact.whatsapp` está vazio, `openWhatsApp` não abre nada
 * e liga `showConfigNotice` — o aviso na seção de contato avisa que o canal
 * ainda não foi configurado, em vez de falhar em silêncio.
 */
export function useContactActions() {
  const [showConfigNotice, setShowConfigNotice] = useState(false);
  const { whatsapp, whatsappMessage, instagram, email } = siteConfig.contact;

  const openWhatsApp = useCallback(() => {
    if (!whatsapp) {
      setShowConfigNotice(true);
      return;
    }
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [whatsapp, whatsappMessage]);

  const openInstagram = useCallback(() => {
    if (!instagram) {
      setShowConfigNotice(true);
      return;
    }
    const url = instagram.startsWith("http")
      ? instagram
      : `https://instagram.com/${instagram.replace(/^@/, "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [instagram]);

  const openEmail = useCallback(() => {
    if (!email) {
      setShowConfigNotice(true);
      return;
    }
    window.location.href = `mailto:${email}`;
  }, [email]);

  return {
    openWhatsApp,
    openInstagram,
    openEmail,
    showConfigNotice,
    hasWhatsApp: Boolean(whatsapp),
    hasInstagram: Boolean(instagram),
    hasEmail: Boolean(email),
  };
}
