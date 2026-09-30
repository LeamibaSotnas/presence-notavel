import type { Env } from "./types";

// ─── Respostas ──────────────────────────────────────────────────────────────

const NO_STORE = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...NO_STORE, ...(init.headers ?? {}) },
  });
}

export function fail(status: number, message: string, extra?: unknown) {
  return json(
    { error: message, ...(extra ? { details: extra } : {}) },
    { status }
  );
}

/**
 * Mensagens de erro genéricas para o cliente; o detalhe vai para o log.
 * Evita revelar estrutura interna em resposta de produção.
 */
export function serverError(error: unknown) {
  console.error("[api]", error);
  return fail(500, "Erro interno. Tente novamente.");
}

// ─── Criptografia ───────────────────────────────────────────────────────────

const encoder = new TextEncoder();

export function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64url(buffer);
}

export function base64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64url(bytes: Uint8Array) {
  return base64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64url(new Uint8Array(digest));
}

/**
 * Comparação em tempo constante. Impede que um atacante descubra um segredo
 * medindo quanto tempo a comparação leva para falhar.
 */
export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── Identificação anônima do cliente ───────────────────────────────────────

/**
 * Hash do IP para uso no controle de taxa. O IP em si nunca é persistido —
 * bom para LGPD e suficiente para contar tentativas.
 */
export async function clientFingerprint(request: Request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "desconhecido";
  return sha256(ip);
}

// ─── Controle de taxa ───────────────────────────────────────────────────────

export type RateLimitResult = { allowed: boolean; retryAfter: number };

/**
 * Janela fixa em D1. Simples de propósito: sem KV extra, sem Durable Object.
 * Para o volume de um site de portfólio é mais que suficiente.
 */
export async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);

  try {
    const row = await env.DB.prepare(
      "SELECT count, window_start FROM rate_limits WHERE key = ?"
    )
      .bind(key)
      .first<{ count: number; window_start: number }>();

    if (!row || row.window_start < windowStart) {
      await env.DB.prepare(
        `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`
      )
        .bind(key, windowStart)
        .run();
      return { allowed: true, retryAfter: 0 };
    }

    if (row.count >= limit) {
      return { allowed: false, retryAfter: windowStart + windowSeconds - now };
    }

    await env.DB.prepare(
      "UPDATE rate_limits SET count = count + 1 WHERE key = ?"
    )
      .bind(key)
      .run();
    return { allowed: true, retryAfter: 0 };
  } catch (error) {
    // Falha no controle de taxa não deve derrubar a requisição.
    console.error("[rateLimit]", error);
    return { allowed: true, retryAfter: 0 };
  }
}

// ─── Validação ──────────────────────────────────────────────────────────────

export function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Aceita telefone brasileiro com ou sem máscara; devolve só os dígitos. */
export function phoneDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

export function newId() {
  return crypto.randomUUID();
}
