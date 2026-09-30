import type { Env } from "./types";
import {
  asString,
  clientFingerprint,
  fail,
  json,
  looksLikeEmail,
  newId,
  phoneDigits,
  rateLimit,
} from "./util";

type LeadRow = {
  id: string;
  name: string;
  contact: string;
  contact_kind: string;
  subject: string | null;
  message: string;
  status: string;
  consent: number;
  country: string | null;
  created_at: number;
};

function toApi(row: LeadRow) {
  const digits =
    row.contact_kind === "phone" ? row.contact.replace(/\D/g, "") : null;
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    contactKind: row.contact_kind,
    // Link pronto para o cliente responder em um clique.
    replyUrl:
      row.contact_kind === "phone"
        ? `https://wa.me/${digits!.length <= 11 ? `55${digits}` : digits}`
        : `mailto:${row.contact}`,
    subject: row.subject,
    message: row.message,
    status: row.status,
    consent: row.consent === 1,
    country: row.country,
    createdAt: row.created_at,
  };
}

/**
 * Rota pública. Defesas em camadas: honeypot, tempo mínimo de preenchimento,
 * controle de taxa por IP com hash, e validação estrita dos campos.
 */
export async function createLead(
  env: Env,
  request: Request,
  ctx: ExecutionContext
) {
  const fingerprint = await clientFingerprint(request);

  // Dois limites com propósitos diferentes. O de requisições protege o Worker
  // de quem martela o endpoint; o de gravações, mais abaixo, protege a caixa de
  // entrada. Separados porque uma pessoa que erra o telefone duas vezes não
  // deve gastar a cota de mensagens — só a validação falhou, nada foi salvo.
  const abuse = await rateLimit(env, `lead-req:${fingerprint}`, 40, 3600);
  if (!abuse.allowed) {
    return fail(429, "Muitas tentativas. Tente novamente mais tarde.", {
      retryAfter: abuse.retryAfter,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Corpo da requisição inválido.");
  }

  // Honeypot: campo escondido no formulário. Humano nunca preenche.
  if (asString(body.website, 200)) {
    return json({ ok: true, id: newId() }, { status: 201 });
  }

  // Bot costuma postar instantaneamente; pessoa leva alguns segundos.
  const elapsed = Number(body.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed < 1500) {
    return fail(400, "Formulário enviado muito rápido. Tente novamente.");
  }

  const name = asString(body.name, 120);
  if (!name) return fail(422, "Informe seu nome.");

  const message = asString(body.message, 2000);
  if (!message) return fail(422, "Escreva sua mensagem.");

  const rawContact = asString(body.contact, 160);
  if (!rawContact) return fail(422, "Informe um telefone ou e-mail.");

  let contact = rawContact;
  let contactKind: "phone" | "email";
  if (looksLikeEmail(rawContact)) {
    contactKind = "email";
    contact = rawContact.toLowerCase();
  } else {
    const digits = phoneDigits(rawContact);
    if (!digits) return fail(422, "Telefone ou e-mail em formato inválido.");
    contactKind = "phone";
    contact = rawContact;
  }

  if (body.consent !== true) {
    return fail(422, "É necessário aceitar o aviso de privacidade.");
  }

  // Validação passou: agora sim cobra a cota de mensagens gravadas.
  const stored = await rateLimit(env, `lead:${fingerprint}`, 8, 3600);
  if (!stored.allowed) {
    return fail(429, "Muitas mensagens enviadas. Tente novamente mais tarde.", {
      retryAfter: stored.retryAfter,
    });
  }

  const subject = asString(body.subject, 120);
  const sourcePath = asString(body.sourcePath, 300);
  const id = newId();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO leads
       (id, name, contact, contact_kind, subject, message, status, consent,
        source_path, user_agent, country, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'new', 1, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      contact,
      contactKind,
      subject,
      message,
      sourcePath,
      (request.headers.get("User-Agent") ?? "").slice(0, 300),
      (request.cf?.country as string) ?? null,
      now
    )
    .run();

  ctx.waitUntil(notifyLead(env, { name, contact, subject, message }));

  return json({ ok: true, id }, { status: 201 });
}

/**
 * Notificação fora do caminho da resposta: o visitante não espera por ela, e
 * uma falha no webhook não faz o formulário falhar. Chamado via waitUntil.
 */
export async function notifyLead(
  env: Env,
  lead: {
    name: string;
    contact: string;
    subject: string | null;
    message: string;
  }
) {
  if (!env.LEAD_WEBHOOK_URL) return;
  try {
    await fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Novo contato pelo site",
        name: lead.name,
        contact: lead.contact,
        subject: lead.subject,
        message: lead.message,
        panel: env.SITE_URL
          ? `${env.SITE_URL.replace(/\/$/, "")}/admin/leads`
          : undefined,
      }),
    });
  } catch (error) {
    console.error("[notifyLead]", error);
  }
}

// ─── Rotas autenticadas ─────────────────────────────────────────────────────

export async function listLeads(env: Env, url: URL) {
  const status = url.searchParams.get("status");
  const valid = ["new", "read", "archived"];

  const query = valid.includes(status ?? "")
    ? env.DB.prepare(
        "SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT 300"
      ).bind(status)
    : env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 300");

  const [{ results }, counts] = await Promise.all([
    query.all<LeadRow>(),
    env.DB.prepare(
      "SELECT status, COUNT(*) as total FROM leads GROUP BY status"
    ).all<{
      status: string;
      total: number;
    }>(),
  ]);

  const summary = { new: 0, read: 0, archived: 0 };
  for (const row of counts.results) {
    if (row.status in summary)
      summary[row.status as keyof typeof summary] = row.total;
  }

  return json({ leads: results.map(toApi), summary });
}

export async function updateLead(env: Env, id: string, request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Corpo da requisição inválido.");
  }

  const status = body.status;
  if (status !== "new" && status !== "read" && status !== "archived") {
    return fail(422, "Status inválido.");
  }

  const result = await env.DB.prepare(
    "UPDATE leads SET status = ? WHERE id = ?"
  )
    .bind(status, id)
    .run();

  if (!result.meta.changes) return fail(404, "Lead não encontrado.");
  return json({ ok: true });
}

export async function deleteLead(env: Env, id: string) {
  const result = await env.DB.prepare("DELETE FROM leads WHERE id = ?")
    .bind(id)
    .run();
  if (!result.meta.changes) return fail(404, "Lead não encontrado.");
  return json({ ok: true });
}

/** Exportação CSV — útil para o cliente levar os contatos para outro lugar. */
export async function exportLeads(env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM leads ORDER BY created_at DESC"
  ).all<LeadRow>();

  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const header = [
    "Data",
    "Nome",
    "Contato",
    "Tipo",
    "Assunto",
    "Mensagem",
    "Status",
  ];
  const rows = results.map(row =>
    [
      new Date(row.created_at).toISOString(),
      row.name,
      row.contact,
      row.contact_kind,
      row.subject,
      row.message,
      row.status,
    ]
      .map(escape)
      .join(",")
  );

  // BOM para o Excel abrir acentuação corretamente.
  const csv = `﻿${header.map(escape).join(",")}\n${rows.join("\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
