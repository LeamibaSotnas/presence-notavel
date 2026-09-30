#!/usr/bin/env node
/**
 * Cria (ou troca a senha de) o usuário do painel.
 *
 *   node scripts/create-admin.mjs cliente@dominio.com "Nome do Cliente"
 *   node scripts/create-admin.mjs cliente@dominio.com "Nome" --local
 *
 * A senha é pedida no terminal e não aparece na tela nem no histórico do shell.
 *
 * ⚠️ As constantes abaixo precisam ser IDÊNTICAS às de
 *    client/src/lib/password.ts, que faz o mesmo alongamento no navegador na
 *    hora do login. Mudar uma sem a outra invalida todos os acessos.
 */

import { createHash, randomBytes, randomUUID, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ITERATIONS = 210_000;
const SALT_PREFIX = "presence-atelier:v1:";
const DB_NAME = "presence-atelier-db";

function base64url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Mesma derivação de client/src/lib/password.ts. */
async function stretchPassword(email, password) {
  const salt = createHash("sha256")
    .update(SALT_PREFIX + email.trim().toLowerCase())
    .digest();

  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(password, "utf8"),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return base64url(new Uint8Array(bits));
}

/** Mesmo formato de worker/auth.ts: "s1$<salt_b64>$<sha256_b64>". */
function storeValue(stretched) {
  const salt = randomBytes(16);
  const hash = createHash("sha256")
    .update(Buffer.concat([salt, Buffer.from(stretched, "utf8")]))
    .digest();
  return `s1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Lê a senha mostrando um asterisco por caractere.
 *
 * Lê o stdin em modo bruto, caractere a caractere, em vez de deixar o readline
 * ecoar e apagar a linha depois: aquela abordagem depende de clearLine/cursorTo
 * e se comporta de forma imprevisível no PowerShell, onde chega a engolir ou
 * duplicar caracteres — e aí as duas digitações "não coincidem" sem motivo.
 *
 * Os asteriscos também servem de conferência visual: dá para contar o que foi
 * digitado, coisa que uma linha em branco não permite.
 */
/**
 * Linhas do stdin quando não há TTY (pipe, CI).
 *
 * Lidas todas de uma vez, na primeira pergunta. Perguntar duas vezes a um
 * readline ligado a um pipe não funciona: o stream termina logo após a
 * primeira leitura e a segunda pergunta fica pendurada para sempre.
 */
let pipedLines = null;

async function readAllLines() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
}

function askPassword(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;

    if (!input.isTTY) {
      const take = () => {
        process.stdout.write(`${prompt}\n`);
        resolve(pipedLines.shift() ?? "");
      };
      if (pipedLines) return take();
      readAllLines().then(lines => {
        pipedLines = lines;
        take();
      }, reject);
      return;
    }

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    let value = "";

    const finish = (error, result) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(result);
    };

    const onData = chunk => {
      for (const char of chunk) {
        switch (char) {
          case "\r":
          case "\n":
            return finish(null, value);
          case "\u0003": // Ctrl+C
            return finish(new Error("Cancelado."));
          case "\u0008": // Backspace
          case "\u007f": // Delete
            if (value.length > 0) {
              value = value.slice(0, -1);
              process.stdout.write("\b \b");
            }
            break;
          default:
            // Ignora teclas de controle (setas viram sequências de escape).
            if (char >= " ") {
              value += char;
              process.stdout.write("*");
            }
        }
      }
    };

    input.on("data", onData);
  });
}

async function main() {
  const [email, name, ...flags] = process.argv.slice(2);
  const local = flags.includes("--local");

  if (!email || !name) {
    console.error(
      'Uso: node scripts/create-admin.mjs <email> "<Nome>" [--local]\n' +
        "  --local  aplica no banco de desenvolvimento (wrangler dev), não em produção."
    );
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    console.error(`E-mail inválido: ${email}`);
    process.exit(1);
  }

  const password = await askPassword("Senha (mínimo 12 caracteres): ");
  if (password.length < 12) {
    console.error("\nSenha curta. Use pelo menos 12 caracteres.");
    process.exit(1);
  }
  const confirm = await askPassword("Repita a senha: ");
  if (password !== confirm) {
    console.error(
      `As senhas não coincidem (${password.length} e ${confirm.length} caracteres). Rode o comando de novo.`
    );
    process.exit(1);
  }

  const id = randomUUID();
  const stored = storeValue(await stretchPassword(email, password));
  const now = Date.now();
  const escaped = value => `'${String(value).replace(/'/g, "''")}'`;

  // UPSERT por e-mail: rodar de novo troca a senha em vez de dar erro.
  const sql = `INSERT INTO admin_users (id, email, name, password, created_at)
VALUES (${escaped(id)}, ${escaped(email.toLowerCase())}, ${escaped(name)}, ${escaped(stored)}, ${now})
ON CONFLICT(email) DO UPDATE SET password = excluded.password, name = excluded.name;`;

  // Vai por arquivo, não por --command: o hash contém caracteres que o shell
  // interpretaria, e o arquivo é apagado em seguida.
  const file = path.join(tmpdir(), `admin-${id}.sql`);
  writeFileSync(file, sql, { mode: 0o600 });

  try {
    const args = ["wrangler", "d1", "execute", DB_NAME, `--file=${file}`];
    args.push(local ? "--local" : "--remote");

    const result = spawnSync("npx", args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.status !== 0) {
      console.error("\nFalha ao aplicar no banco. Possíveis causas:");
      console.error("  • as migrations ainda não rodaram:");
      console.error(
        `      npx wrangler d1 migrations apply ${DB_NAME}${local ? " --local" : " --remote"}`
      );
      console.error(
        "  • o token do wrangler perdeu escopos — rode 'npx wrangler login'"
      );
      process.exit(1);
    }
  } finally {
    unlinkSync(file);
  }

  console.log(
    `\n✓ Acesso criado para ${email} (${local ? "local" : "produção"}).`
  );
  console.log("  Entre em /admin com esse e-mail e a senha que você digitou.");
}

main().catch(error => {
  console.error("Erro inesperado:", error);
  process.exit(1);
});
