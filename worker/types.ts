/** Bindings declarados em wrangler.jsonc. */
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  /** Origem pública do site, usada em links de notificação. Opcional. */
  SITE_URL?: string;
  /** Webhook opcional para avisar de novo lead (e-mail via serviço, Telegram...). */
  LEAD_WEBHOOK_URL?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
};

export type Session = {
  user: AdminUser;
  expiresAt: number;
};
