import type { AdminUser, Env, Session } from "./types";
import {
  base64,
  fail,
  fromBase64,
  json,
  randomToken,
  sha256,
  timingSafeEqual,
} from "./util";

const COOKIE = "pa_session";
const SESSION_DAYS = 14;

const encoder = new TextEncoder();

// ─── Senhas ─────────────────────────────────────────────────────────────────
//
// O alongamento PBKDF2 (210.000 iterações) acontece no NAVEGADOR — ver
// client/src/lib/password.ts, que explica por quê e o que isso preserva.
// Aqui chega um valor de 256 bits já alongado, e o servidor só precisa de um
// hash rápido e salgado por cima dele.
//
// Um SHA-256 basta porque a entrada já tem entropia de 256 bits: não existe
// dicionário para atacar. O salt aleatório impede tabela pré-computada caso
// dois acessos compartilhem a mesma senha alongada.
//
// Formato: "s1$<salt_b64>$<hash_b64>"
//
const SCHEME = "s1";

async function digest(stretched: string, salt: Uint8Array) {
  const value = encoder.encode(stretched);
  const buffer = new Uint8Array(salt.length + value.length);
  buffer.set(salt, 0);
  buffer.set(value, salt.length);
  const hash = await crypto.subtle.digest("SHA-256", buffer as BufferSource);
  return base64(new Uint8Array(hash));
}

export async function hashStretched(stretched: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return `${SCHEME}$${base64(salt)}$${await digest(stretched, salt)}`;
}

export class LegacyHashError extends Error {
  constructor() {
    super("Acesso gravado em formato antigo.");
    this.name = "LegacyHashError";
  }
}

export async function verifyStretched(stretched: string, stored: string) {
  // Acessos criados antes desta mudança usavam PBKDF2 no servidor, com um
  // número de iterações que o Workers recusa. Não dá para verificá-los aqui —
  // sinalizamos para o login responder com uma instrução clara em vez de 500.
  if (stored.startsWith("pbkdf2$")) throw new LegacyHashError();

  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== SCHEME || !salt || !hash) return false;

  return timingSafeEqual(await digest(stretched, fromBase64(salt)), hash);
}

// ─── Sessões ────────────────────────────────────────────────────────────────

function cookieHeader(token: string, maxAgeSeconds: number) {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join("; ");
}

function readCookie(request: Request) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function createSession(
  env: Env,
  userId: string,
  request: Request
) {
  const token = randomToken();
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      await sha256(token),
      userId,
      now,
      expiresAt,
      (request.headers.get("User-Agent") ?? "").slice(0, 300)
    )
    .run();

  return {
    cookie: cookieHeader(token, SESSION_DAYS * 24 * 60 * 60),
    expiresAt,
  };
}

export async function getSession(
  env: Env,
  request: Request
): Promise<Session | null> {
  const token = readCookie(request);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT s.expires_at, u.id, u.email, u.name
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  )
    .bind(await sha256(token))
    .first<{ expires_at: number; id: string; email: string; name: string }>();

  if (!row) return null;

  if (row.expires_at < Date.now()) {
    await destroySession(env, request);
    return null;
  }

  return {
    user: { id: row.id, email: row.email, name: row.name },
    expiresAt: row.expires_at,
  };
}

export async function destroySession(env: Env, request: Request) {
  const token = readCookie(request);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  return cookieHeader("", 0);
}

/** Remove sessões e janelas de rate limit vencidas. Chamado no cron. */
export async function purgeExpired(env: Env) {
  const staleWindow = Math.floor(Date.now() / 1000) - 3600;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(
      Date.now()
    ),
    env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(
      staleWindow
    ),
  ]);
}

// ─── Guarda de rota ─────────────────────────────────────────────────────────

export type Guarded = { user: AdminUser } | { response: Response };

/**
 * Exige sessão válida. Em métodos que alteram estado, confere também a origem
 * da requisição — defesa contra CSRF, somada ao SameSite=Lax do cookie.
 */
export async function requireAuth(
  env: Env,
  request: Request
): Promise<Guarded> {
  const session = await getSession(env, request);
  if (!session)
    return { response: fail(401, "Sessão expirada ou inexistente.") };

  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) {
      return { response: fail(403, "Origem não permitida.") };
    }
  }

  return { user: session.user };
}

export function unauthorized() {
  return json({ authenticated: false }, { status: 401 });
}
