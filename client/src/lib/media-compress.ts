/**
 * Compressão de imagem no navegador, antes do upload.
 *
 * Por que aqui e não no Worker: transcodificar imagem no edge exigiria
 * Cloudflare Images (pago) ou uma lib WASM pesada no bundle do Worker. O
 * navegador já tem um decodificador de imagem e um encoder WebP — usar isso é
 * grátis, e o arquivo chega pequeno na rede, o que também deixa o upload rápido.
 *
 * Uma foto de celular (~4 MB, 4000px) sai daqui com cerca de 300 kB em 2400px.
 */

export type CompressResult = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  /** Dimensões do arquivo como o cliente escolheu, antes de qualquer ajuste. */
  sourceWidth: number;
  sourceHeight: number;
  /** Tamanho original, para mostrar o ganho no painel. */
  originalSize: number;
};

const MAX_EDGE = 2400;

/**
 * Qualidade do WebP.
 *
 * Duas faixas, e a razão da distinção importa: 0.82 é imperceptível numa foto
 * grande, onde o ruído do sensor mascara o artefato, mas é visível numa imagem
 * pequena de traço limpo — captura de tela, arte vetorial rasterizada, logo —
 * onde o artefato cai em cima da borda e aparece. Imagem que não precisou ser
 * reduzida é, por definição, pequena: o arquivo final é leve de qualquer jeito,
 * então não há o que economizar ali. Gastar bytes onde eles são baratos e
 * poupar onde são caros é o oposto de usar um número só.
 */
const QUALITY_PHOTO = 0.82;
const QUALITY_SMALL = 0.92;

/**
 * Largura mínima recomendada por tipo de uso.
 *
 * ⚠️ Compressor NENHUM inventa pixel. A redução aqui só diminui — uma imagem
 * de 689px colocada num fundo de página é esticada pelo navegador até a largura
 * da tela, e o resultado é borrado por aritmética, não por ajuste errado de
 * qualidade. A única correção possível é o arquivo de origem ser maior, e é por
 * isso que o painel precisa avisar na hora do envio, não depois de publicado.
 */
export const RECOMMENDED_WIDTH = {
  /** Fundo de página inteira: precisa cobrir telas de 1920 e acima. */
  background: 1920,
  /** Card de portfólio ou evento: ocupa cerca de um terço da largura. */
  card: 1200,
  /** Item de galeria: menor ainda, mas ampliável no clique. */
  gallery: 1000,
  /** Logo: usado pequeno, mas precisa aguentar tela de alta densidade. */
  logo: 600,
} as const;

export type MediaSlot = keyof typeof RECOMMENDED_WIDTH;

/**
 * Diagnóstico de adequação de uma imagem a um uso, em texto pronto para a tela.
 * `null` quando está adequada — ausência de aviso é o estado normal.
 */
export function resolutionWarning(
  width: number,
  slot: MediaSlot
): string | null {
  const minimum = RECOMMENDED_WIDTH[slot];
  if (!width || width >= minimum) return null;

  const factor = minimum / width;
  const severity = factor >= 2 ? "muito pequena" : "pequena";
  return (
    `Imagem ${severity} para este uso: ${width}px de largura, ` +
    `recomendado ${minimum}px. O navegador vai esticá-la cerca de ` +
    `${factor.toFixed(1)}×, o que borra a imagem. Envie um arquivo maior — ` +
    `nenhum ajuste de qualidade recupera pixel que não existe no original.`
  );
}

/** SVG e GIF passam intactos: vetor não se redimensiona, GIF perde a animação. */
const PASSTHROUGH = new Set(["image/svg+xml", "image/gif"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    image.src = url;
  });
}

export async function compressImage(file: File): Promise<CompressResult> {
  if (PASSTHROUGH.has(file.type)) {
    return {
      blob: file,
      filename: file.name,
      width: 0,
      height: 0,
      sourceWidth: 0,
      sourceHeight: 0,
      originalSize: file.size,
    };
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível neste navegador.");

  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  // scale === 1 significa que a imagem coube sem redução, ou seja, é pequena.
  const quality = scale < 1 ? QUALITY_PHOTO : QUALITY_SMALL;
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/webp", quality)
  );

  // Navegador sem encoder WebP, ou compressão que ficou maior que o original:
  // manda o arquivo como veio.
  if (!blob || blob.size >= file.size) {
    return {
      blob: file,
      filename: file.name,
      width: image.width,
      height: image.height,
      sourceWidth: image.width,
      sourceHeight: image.height,
      originalSize: file.size,
    };
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return {
    blob,
    filename: `${base}.webp`,
    width,
    height,
    sourceWidth: image.width,
    sourceHeight: image.height,
    originalSize: file.size,
  };
}

/** Primeiro quadro do vídeo, para servir de poster e de miniatura no painel. */
export function videoDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (width: number, height: number) => {
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
    video.onerror = () => done(0, 0);
    video.src = url;
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
