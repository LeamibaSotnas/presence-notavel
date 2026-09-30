/**
 * Worker do Presence Atelier.
 *
 *   /api/*    API do painel (auth, conteúdo, mídia, leads)
 *   /media/*  arquivos do R2
 *   /*        site estático, servido pelo binding ASSETS
 *
 * O binding ASSETS já resolve o fallback de SPA (not_found_handling em
 * wrangler.jsonc), então rotas do cliente como /admin funcionam com URL direta.
 */

import {
  createSession,
  destroySession,
  getSession,
  purgeExpired,
  requireAuth,
  verifyPassword,
} from "./auth";
import { getContent, putContent } from "./content";
import {
  createLead,
  deleteLead,
  exportLeads,
  listLeads,
  updateLead,
} from "./leads";
import {
  deleteMedia,
  listMedia,
  serveMedia,
  uploadMedia,
  LIMITS,
} from "./media";
import type { Env } from "./types";
import {
  asString,
  clientFingerprint,
  fail,
  json,
  rateLimit,
  serverError,
} from "./util";

// ─── Login ──────────────────────────────────────────────────────────────────

async function login(env: Env, request: Request) {
  const fingerprint = await clientFingerprint(request);
  // 8 tentativas por 15 min por IP: folgado para quem erra a senha,
  // inviável para força bruta.
  const limit = await rateLimit(env, `login:${fingerprint}`, 8, 900);
  if (!limit.allowed) {
    return fail(429, "Muitas tentativas. Aguarde alguns minutos.", {
      retryAfter: limit.retryAfter,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Corpo da requisição inválido.");
  }

  const email = asString(body.email, 200)?.toLowerCase();
  const password = typeof body.password === "string" ? body.password : null;
  if (!email || !password) return fail(422, "Informe e-mail e senha.");

  const user = await env.DB.prepare(
    "SELECT id, email, name, password FROM admin_users WHERE email = ?"
  )
    .bind(email)
    .first<{ id: string; email: string; name: string; password: string }>();

  // Mensagem idêntica para usuário inexistente e senha errada — não revela
  // quais e-mails existem.
  const invalid = fail(401, "E-mail ou senha incorretos.");
  if (!user) return invalid;
  if (!(await verifyPassword(password, user.password))) return invalid;

  const session = await createSession(env, user.id, request);
  await env.DB.prepare("UPDATE admin_users SET last_login = ? WHERE id = ?")
    .bind(Date.now(), user.id)
    .run();

  return json(
    {
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name },
      expiresAt: session.expiresAt,
    },
    { headers: { "Set-Cookie": session.cookie } }
  );
}

// ─── Roteamento ─────────────────────────────────────────────────────────────

async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL
): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method;

  // ── Público ──
  if (path === "/health") {
    return json({ ok: true, limits: LIMITS });
  }

  if (path === "/content" && method === "GET") {
    return getContent(env);
  }

  if (path === "/leads" && method === "POST") {
    return createLead(env, request, ctx);
  }

  if (path === "/auth/login" && method === "POST") {
    return login(env, request);
  }

  if (path === "/auth/logout" && method === "POST") {
    const cookie = await destroySession(env, request);
    return json(
      { authenticated: false },
      { headers: { "Set-Cookie": cookie } }
    );
  }

  if (path === "/auth/me" && method === "GET") {
    const session = await getSession(env, request);
    return session
      ? json({
          authenticated: true,
          user: session.user,
          expiresAt: session.expiresAt,
        })
      : json({ authenticated: false }, { status: 401 });
  }

  // ── A partir daqui, tudo exige sessão ──
  const guard = await requireAuth(env, request);
  if ("response" in guard) return guard.response;

  if (path === "/content" && method === "PUT") {
    return putContent(env, request, guard.user);
  }

  if (path === "/media" && method === "GET") return listMedia(env, url);
  if (path === "/media" && method === "POST") return uploadMedia(env, request);

  const mediaMatch = path.match(/^\/media\/(.+)$/);
  if (mediaMatch && method === "DELETE") {
    return deleteMedia(env, decodeURIComponent(mediaMatch[1]));
  }

  if (path === "/leads" && method === "GET") return listLeads(env, url);
  if (path === "/leads/export" && method === "GET") return exportLeads(env);

  const leadMatch = path.match(/^\/leads\/([A-Za-z0-9-]+)$/);
  if (leadMatch && method === "PATCH")
    return updateLead(env, leadMatch[1], request);
  if (leadMatch && method === "DELETE") return deleteLead(env, leadMatch[1]);

  return fail(404, "Rota não encontrada.");
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const response = await handleApi(request, env, ctx, url);
        // A API nunca deve ser cacheada por intermediários.
        response.headers.set("X-Robots-Tag", "noindex");
        return response;
      }

      if (url.pathname.startsWith("/media/")) {
        const key = decodeURIComponent(url.pathname.slice("/media/".length));
        if (!key) return new Response("Não encontrado", { status: 404 });
        return serveMedia(env, key, request);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      return serverError(error);
    }
  },

  /** Limpeza diária de sessões e janelas de rate limit vencidas. */
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(purgeExpired(env));
  },
};
