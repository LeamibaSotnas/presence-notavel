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
  /** Tamanho original, para mostrar o ganho no painel. */
  originalSize: number;
};

const MAX_EDGE = 2400;
const QUALITY = 0.82;

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

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/webp", QUALITY)
  );

  // Navegador sem encoder WebP, ou compressão que ficou maior que o original:
  // manda o arquivo como veio.
  if (!blob || blob.size >= file.size) {
    return {
      blob: file,
      filename: file.name,
      width: image.width,
      height: image.height,
      originalSize: file.size,
    };
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return {
    blob,
    filename: `${base}.webp`,
    width,
    height,
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
