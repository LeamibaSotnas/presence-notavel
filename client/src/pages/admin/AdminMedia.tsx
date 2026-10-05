import { useRef, useState } from "react";
import {
  Copy,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { AdminLayout, AdminPageHeader } from "./AdminLayout";
import { MediaThumb, UPLOAD_LIMITS, useMediaLibrary } from "./MediaPicker";
import { formatBytes, RECOMMENDED_WIDTH } from "@/lib/media-compress";

type Filter = "all" | "image" | "video";

export default function AdminMedia() {
  const [filter, setFilter] = useState<Filter>("all");
  const library = useMediaLibrary(filter === "all" ? undefined : filter);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const totalBytes = library.items.reduce((sum, item) => sum + item.size, 0);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(
        new URL(url, window.location.origin).href
      );
      setCopied(url);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard bloqueado (contexto não seguro): não é erro que valha alarme.
    }
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Fotos e vídeos"
        description={`${library.items.length} arquivos · ${formatBytes(totalBytes)} usados`}
        actions={
          <button
            type="button"
            className="admin-btn primary"
            onClick={() => inputRef.current?.click()}
            disabled={library.uploading}
          >
            {library.uploading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Upload size={14} />
            )}
            Enviar arquivos
          </button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={async event => {
          if (!event.target.files?.length) return;
          await library.upload(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="admin-note">
        Enviar um arquivo para cá <b>não o coloca no site</b>. Esta é a
        biblioteca: depois de enviar, vá em <b>Conteúdo</b> e escolha a imagem
        no campo onde ela deve aparecer — fundo do topo, card de portfólio,
        galeria. Só então clique em <b>Publicar alterações</b>.
      </p>

      <p className="admin-note">
        Imagens são otimizadas no navegador antes de subir (convertidas para
        WebP, no máximo 2400px). Limites: {formatBytes(UPLOAD_LIMITS.image)} por
        imagem e {formatBytes(UPLOAD_LIMITS.video)} por vídeo.{" "}
        <b>
          A otimização só reduz, nunca amplia: para um fundo de página, envie um
          arquivo de pelo menos {RECOMMENDED_WIDTH.background}px de largura.
        </b>
      </p>

      {library.progress && (
        <p className="admin-dirty-bar">{library.progress}</p>
      )}
      {library.error && <p className="admin-error">{library.error}</p>}

      <div className="admin-tabs">
        {(
          [
            ["all", "Tudo"],
            ["image", "Imagens"],
            ["video", "Vídeos"],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "active" : undefined}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {library.loading ? (
        <p className="admin-hint">Carregando…</p>
      ) : library.items.length === 0 ? (
        <div className="admin-empty">
          {filter === "video" ? <Video size={22} /> : <ImageIcon size={22} />}
          <p>Nenhum arquivo aqui. Envie o primeiro pelo botão acima.</p>
        </div>
      ) : (
        <div className="media-grid">
          {library.items.map(item => (
            <figure className="media-card static" key={item.key}>
              <MediaThumb item={item} />
              <figcaption>
                <strong title={item.filename}>{item.filename}</strong>
                <span>
                  {formatBytes(item.size)}
                  {item.width && item.height
                    ? ` · ${item.width}×${item.height}`
                    : ""}
                </span>
                <div className="media-card-tools">
                  <button type="button" onClick={() => void copyUrl(item.url)}>
                    <Copy size={13} />
                    {copied === item.url ? "Copiado" : "Copiar link"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir "${item.filename}"? Se estiver em uso no site, a imagem some de lá. A ação não pode ser desfeita.`
                        )
                      ) {
                        void library.remove(item.key);
                      }
                    }}
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
