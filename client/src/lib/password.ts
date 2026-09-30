/**
 * Alongamento de senha no navegador.
 *
 * ── Por que aqui e não no servidor ──────────────────────────────────────────
 *
 * O Cloudflare Workers recusa PBKDF2 acima de 100.000 iterações, e o plano
 * gratuito dá 10 ms de CPU por requisição — 100.000 iterações custam ~114 ms.
 * Fazer o trabalho pesado no servidor simplesmente não cabe.
 *
 * Então o navegador faz as 210.000 iterações (CPU do visitante, sem limite e
 * sem custo) e envia o resultado. O Worker guarda um SHA-256 salgado desse
 * resultado e confere em menos de 1 ms.
 *
 * ── O que isso preserva, e o que não ────────────────────────────────────────
 *
 * PRESERVA a defesa que importa: se o banco vazar, o atacante tem um SHA-256
 * de um valor de 256 bits. Para chegar à senha original ele precisa adivinhar
 * a senha e rodar as 210.000 iterações em cada tentativa — exatamente o mesmo
 * custo de antes. O fator de trabalho não mudou de lugar, só de máquina.
 *
 * NÃO MUDA nada sobre interceptação: o valor alongado trafega como a senha
 * trafegaria, protegido pelo TLS. Quem conseguisse capturá-lo (um XSS, por
 * exemplo) entraria no painel — igualzinho a quem capturasse a senha.
 *
 * ⚠️ As constantes e a derivação do salt precisam ser IDÊNTICAS aqui e em
 *    scripts/create-admin.mjs. Mudar uma sem a outra invalida todos os acessos.
 */

const ITERATIONS = 210_000;
const SALT_PREFIX = "presence-atelier:v1:";

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * O salt vem do e-mail, não é aleatório: o navegador precisa conseguir
 * reproduzi-lo no login sem consultar o servidor antes. Passar pelo SHA-256
 * dá 32 bytes de tamanho fixo a partir de um e-mail de qualquer comprimento.
 */
async function saltFor(email: string) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(SALT_PREFIX + email.trim().toLowerCase())
  );
  return new Uint8Array(digest);
}

export async function stretchPassword(email: string, password: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: (await saltFor(email)) as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return base64url(new Uint8Array(bits));
}
