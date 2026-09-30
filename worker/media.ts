import type { Env } from "./types";
import { asString, fail, json, newId } from "./util";

// ─── Limites ────────────────────────────────────────────────────────────────
//
// Escolhidos com folga para um site de portfólio, e bem abaixo do que o R2
// aguenta (10 GB no plano grátis, egress zero):
//
//   imagem  8 MB  — o painel já comprime para WebP no navegador antes de subir,
//                   então uma foto de câmera cai para algo perto de 300 kB.
//                   Os 8 MB são a folga para quem desliga a compressão.
//   vídeo 120 MB  — ~2 min em 1080p com bitrate razoável.
//
export const LIMITS = {
  image: 8 * 1024 * 1024,
  video: 120 * 1024 * 1024,
} as const;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

type MediaRow = {
  key: string;
  filename: string;
  content_type: string;
  size: number;
  kind: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: number;
};

function toApi(row: MediaRow) {
  return {
    key: row.key,
    url: `/media/${row.key}`,
    filename: row.filename,
    contentType: row.content_type,
    size: row.size,
    kind: row.kind,
    width: row.width,
    height: row.height,
    alt: row.alt,
    createdAt: row.created_at,
  };
}

export async function listMedia(env: Env, url: URL) {
  const kind = url.searchParams.get("kind");
  const query =
    kind === "image" || kind === "video"
      ? env.DB.prepare(
          "SELECT * FROM media WHERE kind = ? ORDER BY created_at DESC LIMIT 500"
        ).bind(kind)
      : env.DB.prepare(
          "SELECT * FROM media ORDER BY created_at DESC LIMIT 500"
        );

  const { results } = await query.all<MediaRow>();
  return json({ media: results.map(toApi) });
}

export async function uploadMedia(env: Env, request: Request) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return fail(400, "Envie o arquivo como multipart/form-data.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Não foi possível ler o formulário.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "Campo 'file' ausente.");

  const type = file.type;
  const kind = IMAGE_TYPES.has(type)
    ? "image"
    : VIDEO_TYPES.has(type)
      ? "video"
      : null;
  if (!kind) {
    return fail(415, `Tipo não aceito: ${type || "desconhecido"}.`);
  }

  const limit = LIMITS[kind];
  if (file.size > limit) {
    const mb = Math.round(limit / 1024 / 1024);
    return fail(
      413,
      `Arquivo acima do limite de ${mb} MB para ${kind === "image" ? "imagem" : "vídeo"}.`
    );
  }
  if (file.size === 0) return fail(400, "Arquivo vazio.");

  const extension = EXTENSIONS[type] ?? "bin";
  const key = `${kind}/${newId()}.${extension}`;

  // Dimensões vêm do navegador, que já leu a imagem para comprimir.
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  const alt = asString(form.get("alt"), 300);

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO media (key, filename, content_type, size, kind, width, height, alt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        key,
        file.name.slice(0, 200) || `arquivo.${extension}`,
        type,
        file.size,
        kind,
        width,
        height,
        alt,
        now
      )
      .run();
  } catch (error) {
    // Metadados falharam: remove o objeto para não deixar órfão no R2.
    await env.MEDIA.delete(key).catch(() => {});
    throw error;
  }

  return json(
    {
      key,
      url: `/media/${key}`,
      filename: file.name,
      contentType: type,
      size: file.size,
      kind,
      width,
      height,
      alt,
      createdAt: now,
    },
    { status: 201 }
  );
}

export async function deleteMedia(env: Env, key: string) {
  const row = await env.DB.prepare("SELECT key FROM media WHERE key = ?")
    .bind(key)
    .first<{ key: string }>();
  if (!row) return fail(404, "Arquivo não encontrado.");

  await env.MEDIA.delete(key);
  await env.DB.prepare("DELETE FROM media WHERE key = ?").bind(key).run();
  return json({ ok: true });
}

/**
 * Serve o arquivo do R2. Rota pública, com cache imutável (a chave tem UUID,
 * então o conteúdo de uma chave nunca muda) e suporte a Range para vídeo.
 */
export async function serveMedia(env: Env, key: string, request: Request) {
  const object = await env.MEDIA.get(key, {
    range: request.headers,
    onlyIf: request.headers,
  });

  if (!object) return new Response("Não encontrado", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");

  // onlyIf satisfeito sem corpo => 304.
  if (!("body" in object) || object.body === null) {
    return new Response(null, { status: 304, headers });
  }

  // 206 só quando o cliente pediu um trecho. Sem cabeçalho Range o R2 ainda
  // devolve object.range preenchido, e responder 206 a uma requisição simples
  // confunde <img>/<video> e alguns proxies.
  const range = request.headers.has("Range")
    ? "range" in object
      ? object.range
      : undefined
    : undefined;
  if (range && "offset" in range) {
    const offset = range.offset ?? 0;
    const length = range.length ?? object.size - offset;
    headers.set(
      "Content-Range",
      `bytes ${offset}-${offset + length - 1}/${object.size}`
    );
    return new Response(object.body, { status: 206, headers });
  }

  return new Response(object.body, { headers });
}
