import type { AdminUser, Env } from "./types";
import { fail, json } from "./util";

/** Teto de segurança para o JSON de conteúdo (256 kB é muito para texto). */
const MAX_CONTENT_BYTES = 256 * 1024;

/**
 * Chaves aceitas no documento de conteúdo. Qualquer outra é descartada na
 * escrita — o painel não pode injetar campos arbitrários no banco.
 */
const ALLOWED_KEYS = new Set([
  "isDemo",
  "identity",
  "seo",
  "theme",
  "contact",
  "nav",
  "hero",
  "about",
  "portfolio",
  "events",
  "gallery",
  "notes",
  "adminConcept",
  "contactSection",
  "interest",
  "footer",
]);

export async function getContent(env: Env) {
  const row = await env.DB.prepare(
    "SELECT data, updated_at FROM content WHERE id = 1"
  ).first<{ data: string; updated_at: number }>();

  // Sem linha = site nunca foi editado. O frontend usa o config embutido.
  if (!row) return json({ content: null, updatedAt: null });

  let content: unknown;
  try {
    content = JSON.parse(row.data);
  } catch {
    console.error("[content] JSON inválido no banco");
    return json({ content: null, updatedAt: null });
  }

  return json(
    { content, updatedAt: row.updated_at },
    { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } }
  );
}

export async function putContent(env: Env, request: Request, user: AdminUser) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Corpo da requisição não é JSON válido.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail(400, "Esperado um objeto de conteúdo.");
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.has(key)) filtered[key] = value;
  }

  if (Object.keys(filtered).length === 0) {
    return fail(400, "Nenhum campo reconhecido no conteúdo enviado.");
  }

  const serialized = JSON.stringify(filtered);
  if (new TextEncoder().encode(serialized).length > MAX_CONTENT_BYTES) {
    return fail(
      413,
      "Conteúdo excede 256 kB. Use a biblioteca de mídia para arquivos."
    );
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO content (id, data, updated_at, updated_by) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  )
    .bind(serialized, now, user.email)
    .run();

  return json({ ok: true, updatedAt: now });
}
