import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { ApiError, media as mediaApi, type MediaItem } from "@/lib/api";
import {
  compressImage,
  formatBytes,
  resolutionWarning,
  videoDimensions,
  type MediaSlot,
} from "@/lib/media-compress";

export const UPLOAD_LIMITS = {
  image: 8 * 1024 * 1024,
  video: 120 * 1024 * 1024,
} as const;

type UseMediaLibrary = {
  items: MediaItem[];
  loading: boolean;
  error: string | null;
  uploading: boolean;
  progress: string | null;
  reload: () => Promise<void>;
  upload: (files: FileList | File[]) => Promise<MediaItem[]>;
  remove: (key: string) => Promise<void>;
};

/** Estado compartilhado pela biblioteca e pelo seletor. */
export function useMediaLibrary(kind?: "image" | "video"): UseMediaLibrary {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mediaApi.list(kind);
      setItems(result.media);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível carregar a mídia."
      );
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return [];

    setUploading(true);
    setError(null);
    const uploaded: MediaItem[] = [];

    try {
      for (const [index, file] of list.entries()) {
        const position = `${index + 1}/${list.length}`;
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
          throw new ApiError(415, `"${file.name}" não é imagem nem vídeo.`);
        }

        const limit = isImage ? UPLOAD_LIMITS.image : UPLOAD_LIMITS.video;
        if (file.size > limit) {
          throw new ApiError(
            413,
            `"${file.name}" tem ${formatBytes(file.size)} — o limite é ${formatBytes(limit)}.`
          );
        }

        if (isImage) {
          setProgress(`${position} · otimizando ${file.name}`);
          const compressed = await compressImage(file);
          setProgress(
            `${position} · enviando ${formatBytes(compressed.blob.size)}` +
              (compressed.blob.size < compressed.originalSize
                ? ` (de ${formatBytes(compressed.originalSize)})`
                : "")
          );
          uploaded.push(
            await mediaApi.upload(compressed.blob, {
              filename: compressed.filename,
              width: compressed.width || undefined,
              height: compressed.height || undefined,
            })
          );
        } else {
          setProgress(
            `${position} · enviando ${file.name} (${formatBytes(file.size)})`
          );
          const dimensions = await videoDimensions(file);
          uploaded.push(
            await mediaApi.upload(file, {
              filename: file.name,
              width: dimensions.width || undefined,
              height: dimensions.height || undefined,
            })
          );
        }
      }

      setItems(current => [...uploaded, ...current]);
      return uploaded;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Falha no envio do arquivo."
      );
      return uploaded;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, []);

  const remove = useCallback(async (key: string) => {
    try {
      await mediaApi.remove(key);
      setItems(current => current.filter(item => item.key !== key));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível remover."
      );
    }
  }, []);

  return { items, loading, error, uploading, progress, reload, upload, remove };
}

// ─── Miniatura ──────────────────────────────────────────────────────────────

export function MediaThumb({ item }: { item: MediaItem }) {
  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        muted
        playsInline
        preload="metadata"
        className="media-thumb-media"
      />
    );
  }
  return (
    <img
      src={item.url}
      alt={item.alt ?? item.filename}
      loading="lazy"
      className="media-thumb-media"
    />
  );
}

/**
 * Dimensões do arquivo, com aviso quando não servem para o uso pretendido.
 *
 * Fica junto da miniatura de propósito: o momento de descobrir que a imagem é
 * pequena demais é o da escolha, não o de olhar o site publicado e achar que o
 * sistema degradou o arquivo.
 */
export function MediaDimensions({
  item,
  slot,
}: {
  item: MediaItem;
  slot?: MediaSlot;
}) {
  if (!item.width || !item.height) return null;
  const warning = slot ? resolutionWarning(item.width, slot) : null;

  return (
    <span className={warning ? "media-card-dim warn" : "media-card-dim"}>
      {item.width}×{item.height}
      {warning && (
        <>
          {" "}
          <AlertTriangle size={11} aria-hidden /> pequena para este uso
        </>
      )}
    </span>
  );
}

// ─── Seletor em modal ───────────────────────────────────────────────────────

type MediaPickerProps = {
  open: boolean;
  kind?: "image" | "video";
  /** Uso pretendido, para conferir a resolução contra o mínimo daquele uso. */
  slot?: MediaSlot;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
};

export function MediaPicker({
  open,
  kind,
  slot,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const library = useMediaLibrary(kind);
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setWarning(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const accept =
    kind === "video"
      ? "video/*"
      : kind === "image"
        ? "image/*"
        : "image/*,video/*";

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher mídia"
        onClick={event => event.stopPropagation()}
      >
        <header>
          <h2>Escolher {kind === "video" ? "vídeo" : "imagem"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="admin-picker-actions">
          <button
            type="button"
            className="admin-btn"
            onClick={() => inputRef.current?.click()}
            disabled={library.uploading}
          >
            {library.uploading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Upload size={14} />
            )}
            Enviar do computador
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={async event => {
              if (!event.target.files?.length) return;
              const uploaded = await library.upload(event.target.files);
              event.target.value = "";
              const first = uploaded[0];
              if (!first) return;

              // A imagem é escolhida de qualquer forma — a decisão é do
              // cliente, não nossa. Mas se ela não serve para este uso, o
              // modal fica aberto com o motivo na tela, em vez de fechar e
              // deixar a descoberta para depois de publicado.
              const problem =
                slot && first.width ? resolutionWarning(first.width, slot) : null;
              onSelect(first);
              if (problem) setWarning(problem);
              else onClose();
            }}
          />
          {library.progress && (
            <span className="admin-hint">{library.progress}</span>
          )}
        </div>

        {library.error && <p className="admin-error">{library.error}</p>}
        {warning && (
          <p className="admin-warn-block">
            <AlertTriangle size={15} aria-hidden /> {warning}
          </p>
        )}

        {library.loading ? (
          <p className="admin-hint">Carregando…</p>
        ) : library.items.length === 0 ? (
          <div className="admin-empty">
            {kind === "video" ? <Video size={22} /> : <ImageIcon size={22} />}
            <p>Nenhum arquivo ainda. Envie o primeiro pelo botão acima.</p>
          </div>
        ) : (
          <div className="media-grid picker">
            {library.items.map(item => (
              <button
                type="button"
                key={item.key}
                className="media-card"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <MediaThumb item={item} />
                <span className="media-card-name">{item.filename}</span>
                <MediaDimensions item={item} slot={slot} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
