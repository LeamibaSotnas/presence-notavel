#!/usr/bin/env node
/**
 * Cria (ou troca a senha de) o usuário do painel.
 *
 *   node scripts/create-admin.mjs cliente@dominio.com "Nome do Cliente"
 *   node scripts/create-admin.mjs cliente@dominio.com "Nome" --local
 *
 * A senha é pedida no terminal e não aparece na tela nem no histórico do shell.
 * O hash usa PBKDF2-SHA256 com 210.000 iterações, no mesmo formato que o
 * Worker verifica em worker/auth.ts.
 */

import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ITERATIONS = 210_000;
const DB_NAME = "presence-atelier-db";

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Lê a senha sem ecoar no terminal. */
function askPassword(prompt) {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const onData = char => {
      if (["\n", "\r", "\u0004"].includes(char.toString())) return;
      // Reescreve a linha sem revelar os caracteres digitados.
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      process.stdout.write(prompt);
    };
    process.stdin.on("data", onData);
    rl.question(prompt, answer => {
      process.stdin.off("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
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
    console.error("\nAs senhas não coincidem.");
    process.exit(1);
  }

  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();
  const escaped = value => `'${String(value).replace(/'/g, "''")}'`;

  // UPSERT por e-mail: rodar de novo troca a senha em vez de dar erro.
  const sql = `INSERT INTO admin_users (id, email, name, password, created_at)
VALUES (${escaped(id)}, ${escaped(email.toLowerCase())}, ${escaped(name)}, ${escaped(passwordHash)}, ${now})
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
      console.error(
        "\nFalha ao aplicar no banco. Verifique se as migrations já rodaram:"
      );
      console.error(
        `  npx wrangler d1 migrations apply ${DB_NAME}${local ? " --local" : " --remote"}`
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
