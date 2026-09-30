#!/usr/bin/env node
/**
 * Baixa todas as imagens remotas declaradas no bloco `IMG` de
 * client/src/config/site.config.ts para client/public/images/ e reescreve
 * o arquivo de config apontando para os caminhos locais.
 *
 *   node scripts/fetch-remote-images.mjs
 *
 * Idempotente: rodar de novo não faz nada se já não houver URL remota.
 * Precisa de rede (rode no seu terminal, não em sandbox sem saída).
 */

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "client", "src", "config", "site.config.ts");
const OUT_DIR = path.join(ROOT, "client", "public", "images");

const EXT_BY_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

function log(symbol, message) {
  console.log(`${symbol} ${message}`);
}

async function download(key, url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = (response.headers.get("content-type") || "").split(
    ";"
  )[0];
  const ext =
    EXT_BY_TYPE[contentType] ||
    path.extname(new URL(url).pathname).split("?")[0] ||
    ".jpg";

  const filename = `${key}${ext}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(OUT_DIR, filename), buffer);

  const kb = (buffer.byteLength / 1024).toFixed(0);
  log("  ✓", `${key} → images/${filename} (${kb} kB)`);
  return `/images/${filename}`;
}

async function main() {
  let source = await readFile(CONFIG, "utf8");

  // Isola o bloco `const IMG = { ... } as const;` para não tocar em
  // outras URLs do arquivo (canonical, ogImage, links sociais).
  const blockStart = source.indexOf("const IMG = {");
  const blockEnd = source.indexOf("} as const;", blockStart);
  if (blockStart === -1 || blockEnd === -1) {
    throw new Error(
      "Bloco `const IMG = { ... } as const;` não encontrado em site.config.ts"
    );
  }
  const block = source.slice(blockStart, blockEnd);

  // Captura cada entrada do bloco IMG cujo valor seja uma URL http(s).
  const entry = /(\b[a-zA-Z0-9_]+)\s*:\s*\n?\s*"(https?:\/\/[^"]+)"/g;
  const found = [...block.matchAll(entry)].map(([, key, url]) => ({
    key,
    url,
  }));

  if (found.length === 0) {
    log("✓", "Nenhuma URL remota encontrada — as imagens já são locais.");
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  log("→", `${found.length} imagem(ns) remota(s) encontrada(s). Baixando...`);

  const failures = [];
  for (const { key, url } of found) {
    try {
      const localPath = await download(key, url);
      source = source.replaceAll(`"${url}"`, `"${localPath}"`);
    } catch (error) {
      failures.push({ key, url, error: error.message });
      log("  ✗", `${key} falhou: ${error.message}`);
    }
  }

  await writeFile(CONFIG, source, "utf8");

  log("", "");
  log("✓", `site.config.ts atualizado (${found.length - failures.length} ok).`);

  if (failures.length > 0) {
    log("!", `${failures.length} falha(s) — as URLs abaixo seguem remotas:`);
    for (const f of failures) console.log(`    ${f.key}: ${f.url}`);
    process.exitCode = 1;
  } else {
    log(
      "→",
      "Confira o site com `pnpm dev` e faça o commit de client/public/images/."
    );
  }
}

main().catch(error => {
  console.error("Erro inesperado:", error);
  process.exit(1);
});
